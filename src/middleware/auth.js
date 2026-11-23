const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

const ACCESS_SECRET =
  process.env.AUTH_SECRET || "dev-only-secret-change-me-in-production";

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    ACCESS_SECRET,
    { expiresIn: "15m" },
  );
}

/** Express middleware: verifies Bearer token, sets req.user = {id, email}. */
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "token tidak ada" });
  }
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch (_err) {
    return res.status(401).json({ message: "token tidak valid atau kedaluwarsa" });
  }
}

/**
 * Role gate against users.role ('user' | 'admin'). The ADMIN_EMAILS env
 * list bootstraps the column on boot so the first admin can log in.
 * Usage: authorize("admin")
 */
function authorize(role) {
  return async (req, res, next) => {
    try {
      if (role !== "admin") return next();
      const { rows } = await pool.query(
        `SELECT role FROM users WHERE id = $1`,
        [req.user.id],
      );
      const userRole = rows[0]?.role;
      if (userRole === "admin") return next();
      // Env fallback keeps the bootstrap admin working before migration.
      const admins = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      if (admins.includes((req.user.email || "").toLowerCase())) {
        // Promote lazily so the DB becomes the source of truth.
        await pool.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [
          req.user.id,
        ]);
        return next();
      }
      return res.status(403).json({ message: "akses ditolak" });
    } catch (_err) {
      return res.status(500).json({ message: "akses ditolak" });
    }
  };
}

/** Idempotent role column + bootstrap admins; called on boot. */
async function ensureRoles() {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20)
      NOT NULL DEFAULT 'user'
  `);
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (admins.length > 0) {
    await pool.query(
      `UPDATE users SET role = 'admin'
       WHERE lower(email) = ANY($1::text[])`,
      [admins],
    );
  }
}

module.exports = {
  authenticate,
  authorize,
  signAccessToken,
  ensureRoles,
  ACCESS_SECRET,
};
