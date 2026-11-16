const jwt = require("jsonwebtoken");

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
 * Role gate. Admin membership comes from the ADMIN_EMAILS env list
 * (comma-separated) — cheaper than joining roles/user_roles for now.
 * Usage: authorize("admin")
 */
function authorize(role) {
  return (req, res, next) => {
    const admins = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (role === "admin" && !admins.includes((req.user.email || "").toLowerCase())) {
      return res.status(403).json({ message: "akses ditolak" });
    }
    next();
  };
}

module.exports = { authenticate, authorize, signAccessToken, ACCESS_SECRET };
