const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { pool } = require("../config/database");
const User = require("../models/User");
const { signAccessToken } = require("../middleware/auth");
const { issueRefreshToken, publicUser } = require("./AuthController");
const { sessionForUser } = require("../services/appwrite");

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

let mailer = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function ensureCodesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_codes (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      purpose VARCHAR(20) NOT NULL,
      code_hash VARCHAR(64) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function issueCode(email, purpose) {
  const code = String(crypto.randomInt(100000, 1000000));
  await pool.query(
    `INSERT INTO auth_codes (email, purpose, code_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '${OTP_TTL_MINUTES} minutes')`,
    [email.toLowerCase(), purpose, sha256(code)],
  );
  return code;
}

async function sendMail(to, subject, text) {
  if (!mailer) {
    // Dev without SMTP: visible in server logs only.
    console.log(`[OTP] (dev, no SMTP) ${subject} → ${to}: ${text}`);
    return false;
  }
  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
  });
  return true;
}

/**
 * POST /api/auth/otp/request { email, purpose: "activate" | "reset" }
 * Always answers 200 so the endpoint can't be used to enumerate accounts.
 * In dev (no SMTP) the code is echoed back in the response.
 */
async function requestOtp(req, res) {
  const { email, purpose } = req.body || {};
  if (!email || !["activate", "reset"].includes(purpose)) {
    return res.status(400).json({ message: "email dan purpose (activate|reset) harus diisi" });
  }
  const user = await User.findByEmail(email);
  if (user) {
    const code = await issueCode(email, purpose);
    const sent = await sendMail(
      email,
      purpose === "activate" ? "Kode aktivasi SatyaTech" : "Reset password SatyaTech",
      `Kode kamu: ${code} (berlaku ${OTP_TTL_MINUTES} menit)`,
    );
    if (!sent && process.env.NODE_ENV !== "production") {
      return res.json({ message: "SMTP belum diset — kode dev", devCode: code });
    }
  }
  return res.json({ message: "jika akun ada, kode sudah dikirim" });
}

/**
 * POST /api/auth/otp/verify { email, code }
 * Marks the account active and logs the user in.
 */
async function verifyOtp(req, res) {
  const { email, code } = req.body || {};
  if (!email || !code) {
    return res.status(400).json({ message: "email dan code harus diisi" });
  }
  const ok = await consumeCode(email, "activate", code);
  if (!ok) return res.status(401).json({ message: "kode tidak valid atau kedaluwarsa" });

  await pool.query(`UPDATE users SET active = true WHERE email = $1`, [
    email.toLowerCase(),
  ]);
  const user = await User.findByEmail(email);
  const rawRefresh = await issueRefreshToken(user.id);
  return res.json({
    accessToken: signAccessToken(user),
    refreshToken: rawRefresh,
    appwriteSession: await sessionForUser(user),
    user: publicUser(user),
  });
}

/**
 * POST /api/auth/reset-password { email, code, newPassword }
 */
async function resetPassword(req, res) {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: "email, code, dan newPassword harus diisi" });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ message: "password minimal 8 karakter" });
  }
  const ok = await consumeCode(email, "reset", code);
  if (!ok) return res.status(401).json({ message: "kode tidak valid atau kedaluwarsa" });

  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query(`UPDATE users SET password_hash = $1 WHERE email = $2`, [
    hash,
    email.toLowerCase(),
  ]);
  // Any stolen session dies with the password change.
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
    [email.toLowerCase()],
  );
  return res.json({ message: "password berhasil diubah" });
}

/** Single-use code check with attempt throttling. */
async function consumeCode(email, purpose, code) {
  const { rows } = await pool.query(
    `SELECT * FROM auth_codes
     WHERE email = $1 AND purpose = $2 AND used_at IS NULL
     ORDER BY id DESC LIMIT 1`,
    [email.toLowerCase(), purpose],
  );
  const row = rows[0];
  if (!row) return false;
  if (new Date(row.expires_at) < new Date()) return false;
  if (row.attempts >= MAX_ATTEMPTS) {
    await pool.query(`UPDATE auth_codes SET used_at = NOW() WHERE id = $1`, [row.id]);
    return false;
  }
  if (row.code_hash !== sha256(String(code))) {
    await pool.query(`UPDATE auth_codes SET attempts = attempts + 1 WHERE id = $1`, [row.id]);
    return false;
  }
  await pool.query(`UPDATE auth_codes SET used_at = NOW() WHERE id = $1`, [row.id]);
  return true;
}

module.exports = { OtpController: { requestOtp, verifyOtp, resetPassword }, ensureCodesTable };
