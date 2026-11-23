const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { pool } = require("../config/database");
const User = require("../models/User");
const { AppSetting } = require("../models/AppSetting");
const { signAccessToken, authenticate } = require("../middleware/auth");
const {
  appwriteReady,
  verifyJwt,
  sessionForUser,
} = require("../services/appwrite");

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
    avatar_url: u.avatar_url,
    role: u.role,
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
    // Mobile: one-time secret the app redeems for an Appwrite session,
    // which push delivery (Appwrite Push) subscribes to.
    const appwriteSession = await sessionForUser(user);
    return res.json({
      accessToken,
      refreshToken: rawRefresh,
      appwriteSession,
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
    // The Appwrite session is deleted by the mobile client itself.
    res.clearCookie("refresh_token", { path: "/api/auth" });
    return res.json({ message: "logout berhasil" });
  }

  /**
   * POST /api/auth/social — Google/Apple sign-in. The client creates an
   * Appwrite session natively, sends the Appwrite JWT, and this exchanges
   * it for the same JWT session pair as password login.
   */
  static async social(req, res) {
    const { idToken, provider } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ message: "idToken harus diisi" });
    }
    if (!appwriteReady()) {
      return res
        .status(503)
        .json({ message: "login sosial belum dikonfigurasi di server" });
    }
    let decoded;
    try {
      decoded = await verifyJwt(idToken);
    } catch {
      return res.status(401).json({ message: "idToken tidak valid" });
    }
    if (!decoded.email) {
      return res
        .status(400)
        .json({ message: "akun sosial tidak memiliki email" });
    }
    await ensureSocialColumns();

    // Link by appwrite_id first, then by email (existing account upgrade).
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE appwrite_id = $1 OR email = $2 LIMIT 1`,
      [decoded.appwriteId, decoded.email],
    );
    let user = rows[0];
    if (!user) {
      const inserted = await pool.query(
        `INSERT INTO users (name, email, password_hash, appwrite_id, auth_provider)
         VALUES ($1, $2, NULL, $3, $4)
         RETURNING *`,
        [decoded.name, decoded.email, decoded.appwriteId, provider || "social"],
      );
      user = inserted.rows[0];
    } else if (!user.appwrite_id) {
      const updated = await pool.query(
        `UPDATE users SET appwrite_id = $1, auth_provider = $2 WHERE id = $3
         RETURNING *`,
        [decoded.appwriteId, provider || "social", user.id],
      );
      user = updated.rows[0];
    }
    if (user.active === false) {
      return res.status(401).json({ message: "akun tidak aktif" });
    }
    const accessToken = signAccessToken(user);
    const rawRefresh = await issueRefreshToken(user.id);
    // No appwriteSession here: the mobile client already holds the Appwrite
    // session it created before calling this endpoint.
    return res.json({
      accessToken,
      refreshToken: rawRefresh,
      user: publicUser(user),
    });
  }
}

async function ensureSocialColumns() {
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS appwrite_id TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20);
  `);
  // Social accounts have no password; existing rows keep theirs.
  await pool.query(`
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
  `);
}

/** PUT /api/auth/profile — self-service profile update (name only). */
async function updateProfile(req, res) {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "name harus diisi" });
  }
  const { rows } = await pool.query(
    `UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email, donation_amount, active, biometric_enabled, created_at`,
    [String(name).trim(), req.user.id],
  );
  if (rows.length === 0) return res.status(404).json({ message: "user tidak ditemukan" });
  res.json({ user: rows[0] });
}

/** GET /api/auth/entitlement — premium unlock state for the caller. */
async function entitlement(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "user tidak ditemukan" });
  // shortcut: donation-based until a real payment provider lands
  const unlocked = Number(user.donation_amount ?? 0) > 0;
  res.json({
    unlocked,
    donation_amount: user.donation_amount,
    freeChapterLimit: Number((await AppSetting.get("free_chapter_limit")) ?? 4),
    subscribeUrl: process.env.SUBSCRIBE_URL || "https://satyatech.org/subscribe",
  });
}

/** GET /api/auth/profile/avatar — the caller's avatar URL. */
async function getAvatar(req, res) {
  const { rows } = await pool.query(
    `SELECT avatar_url FROM users WHERE id = $1`,
    [req.user.id],
  );
  res.json({ avatarUrl: rows[0]?.avatar_url ?? null });
}

/** PUT /api/auth/profile/avatar — multipart "file" (user role, images only). */
async function uploadAvatar(req, res) {
  const file = req.file;
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!file) return res.status(400).json({ message: "file harus diisi" });
  if (!allowed.includes(file.mimetype)) {
    return res.status(400).json({ message: "hanya jpg/png/webp" });
  }
  if (file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ message: "maksimal 5MB" });
  }
  const url = `/uploads/${file.filename}`;
  await pool.query(`UPDATE users SET avatar_url = $1 WHERE id = $2`, [
    url,
    req.user.id,
  ]);
  res.json({ avatarUrl: url });
}

/** GET /me handler (behind authenticate). */
async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "user tidak ditemukan" });
  res.json({ user: publicUser(user) });
}

module.exports = {
  AuthController,
  ensureRefreshTable,
  issueRefreshToken,
  publicUser,
  ensureSocialColumns,
  me,
  updateProfile,
  entitlement,
  getAvatar,
  uploadAvatar,
};
