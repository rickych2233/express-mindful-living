const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { pool } = require("../config/database");
const User = require("../models/User");
const { signAccessToken, authenticate } = require("../middleware/auth");

const REFRESH_TTL_DAYS = 30;

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

async function ensureRefreshTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      rotated_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function issueRefreshToken(userId) {
  const raw = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 3600 * 1000);
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, sha256(raw), expires],
  );
  return raw;
}

async function rotateRefreshToken(raw) {
  const { rows } = await pool.query(
    `SELECT * FROM refresh_tokens WHERE token_hash = $1`,
    [sha256(raw)],
  );
  const row = rows[0];
  if (!row || row.revoked_at || new Date(row.expires_at) < new Date()) {
    return null;
  }
  // Reuse detection: a rotated token being replayed → revoke the whole family.
  if (row.rotated_at) {
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1`,
      [row.user_id],
    );
    return null;
  }
  const fresh = await issueRefreshToken(row.user_id);
  await pool.query(
    `UPDATE refresh_tokens SET rotated_at = NOW(), revoked_at = NOW() WHERE id = $1`,
    [row.id],
  );
  return { userId: row.user_id, raw: fresh };
}

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    donation_amount: u.donation_amount,
    active: u.active,
    biometric_enabled: u.biometric_enabled,
    created_at: u.created_at,
  };
}

class AuthController {
  static async login(req, res) {
    const { email, password, useCookies } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "email dan password harus diisi" });
    }
    const user = await User.findByEmail(email);
    // Same error for unknown email and wrong password.
    const ok =
      user &&
      user.active !== false &&
      (await bcrypt.compare(password, user.password_hash));
    if (!ok) {
      return res.status(401).json({ message: "email atau password salah" });
    }
    const accessToken = signAccessToken(user);
    const rawRefresh = await issueRefreshToken(user.id);
    // Web (admin SPA): refresh token lives in an httpOnly cookie so JS/XSS
    // can never read it; only the short-lived access token is in memory.
    if (useCookies) {
      const isProd = process.env.NODE_ENV === "production";
      res.cookie("refresh_token", rawRefresh, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/api/auth",
        maxAge: REFRESH_TTL_DAYS * 24 * 3600 * 1000,
      });
      return res.json({ accessToken, user: publicUser(user) });
    }
    return res.json({
      accessToken,
      refreshToken: rawRefresh,
      user: publicUser(user),
    });
  }

  static async refresh(req, res) {
    const { refreshToken } = req.body || {};
    const cookieToken = req.cookies ? req.cookies.refresh_token : null;
    const token = refreshToken || cookieToken;
    if (!token) {
      return res.status(400).json({ message: "refreshToken harus diisi" });
    }
    const rotated = await rotateRefreshToken(token);
    if (!rotated) {
      return res.status(401).json({ message: "refresh token tidak valid" });
    }
    const user = await User.findById(rotated.userId);
    if (!user || user.active === false) {
      return res.status(401).json({ message: "akun tidak aktif" });
    }
    const useCookies = Boolean(cookieToken);
    if (useCookies) {
      const isProd = process.env.NODE_ENV === "production";
      res.cookie("refresh_token", rotated.raw, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/api/auth",
        maxAge: REFRESH_TTL_DAYS * 24 * 3600 * 1000,
      });
      return res.json({ accessToken: signAccessToken(user), user: publicUser(user) });
    }
    return res.json({
      accessToken: signAccessToken(user),
      refreshToken: rotated.raw,
      user: publicUser(user),
    });
  }

  /** Revokes every refresh token of the caller. */
  static async logout(req, res) {
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [req.user.id],
    );
    res.clearCookie("refresh_token", { path: "/api/auth" });
    return res.json({ message: "logout berhasil" });
  }

}

/** GET /me handler (behind authenticate). */
async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "user tidak ditemukan" });
  res.json({ user: publicUser(user) });
}

module.exports = { AuthController, ensureRefreshTable, publicUser, me };
