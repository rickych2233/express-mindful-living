const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const { initDatabase } = require("./src/config/initDatabase");
const userRoutes = require("./src/routes/userRoutes");
const chapterRoutes = require("./src/routes/chapterRoutes");
const resourceRoutes = require("./src/routes/resourceRoutes");
const practiceRoutes = require("./src/routes/practiceRoutes");
const roleRoutes = require("./src/routes/roleRoutes");
const communityRoutes = require("./src/routes/communityRoutes");
const mediaRoutes = require("./src/routes/mediaRoutes");
const notesRoutes = require("./src/routes/notesRoutes");
const uploadRoutes = require("./src/routes/uploadRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Support multiple allowed origins for CORS
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get("/", (req, res) => {
  res.send("API auth Express + PostgreSQL aktif");
});

app.use("/api/users", userRoutes);
app.use("/api/chapters", chapterRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/practices", practiceRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api", notesRoutes); // Provides /api/notes, /api/bookmarks, /api/note-categories
app.use("/api/upload", uploadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
(async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server berjalan di port ${PORT}`);
    });
  } catch (error) {
    console.error("FAILED_TO_START_SERVER", error);
  }
})();