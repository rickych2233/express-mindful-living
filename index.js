const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { initDatabase } = require("./src/config/initDatabase");
const userRoutes = require("./src/routes/userRoutes");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API auth Express + PostgreSQL aktif");
});

app.use("/users", userRoutes);

app.get("/chapters", async (req, res) => {
  try {
    const { pool } = require("./src/config/database");
    const chaptersResult = await pool.query(
      "SELECT * FROM chapters ORDER BY chapter_order ASC"
    );

    return res.status(200).json({
      message: "data chapters berhasil diambil",
      chapters: chaptersResult.rows,
    });
  } catch (error) {
    console.error("GET_CHAPTERS_ERROR", error);
    return res.status(500).json({
      message: "terjadi kesalahan server",
    });
  }
});

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