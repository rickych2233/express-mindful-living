const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const { initDatabase } = require("./src/config/initDatabase");
const userRoutes = require("./src/routes/userRoutes");
const authRoutes = require("./src/routes/authRoutes");
const chapterRoutes = require("./src/routes/chapterRoutes");
const resourceRoutes = require("./src/routes/resourceRoutes");
const practiceRoutes = require("./src/routes/practiceRoutes");
const roleRoutes = require("./src/routes/roleRoutes");
const communityRoutes = require("./src/routes/communityRoutes");
const mediaRoutes = require("./src/routes/mediaRoutes");
const notesRoutes = require("./src/routes/notesRoutes");
const uploadRoutes = require("./src/routes/uploadRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const translationRoutes = require("./src/routes/translationRoutes");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Support multiple allowed origins for CORS
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://187.124.129.55",
  "https://admin.satyatech.org",
  "http://admin.satyatech.org",
  "https://satyatech.org",
  "https://www.satyatech.org",
  "http://satyatech.org",
  "http://www.satyatech.org",
];
const allowedOrigins = Array.from(
  new Set([
    ...defaultOrigins,
    ...(process.env.FRONTEND_ORIGIN || "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  ])
);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, same-origin GETs, etc.)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^https?:\/\/([a-z0-9-]+\.)?satyatech\.org$/i.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
app.use(cookieParser());
// Baseline security headers (helmet-lite).
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
// Brute-force guards on credential endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "terlalu banyak percobaan, coba lagi nanti" },
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get("/", (req, res) => {
  res.send("API auth Express + PostgreSQL aktif");
});

const { ensureRefreshTable } = require("./src/controllers/AuthController");
const { authenticate, authorize } = require("./src/middleware/auth");

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
// Content management: reads are public for the mobile app, writes are
// admin only (role via ADMIN_EMAILS env). Route files keep their own
// GET handlers public and mutations behind the guard below.
const adminOnly = [authenticate, authorize("admin")];
app.use("/api/chapters", chapterRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/practices", practiceRoutes);
app.use("/api/roles", adminOnly, roleRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/upload", adminOnly, uploadRoutes);
app.use("/api/dashboard", adminOnly, dashboardRoutes);
app.use("/api/community", communityRoutes);
app.use("/api", notesRoutes); // Provides /api/notes, /api/bookmarks, /api/note-categories
app.use("/api/translate", translationRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
(async () => {
  try {
    await initDatabase();
    await ensureRefreshTable();
    const { ensureCodesTable } = require("./src/controllers/OtpController");
    await ensureCodesTable();
    app.listen(PORT, () => {
      console.log(`Server berjalan di port ${PORT}`);
    });
  } catch (error) {
    console.error("FAILED_TO_START_SERVER", error);
  }
})();