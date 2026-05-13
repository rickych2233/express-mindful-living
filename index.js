const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const { initDatabase } = require("./src/config/initDatabase");
const userRoutes = require("./src/routes/userRoutes");
const chapterRoutes = require("./src/routes/chapterRoutes");

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

app.use("/api/users", userRoutes);
app.use("/api/chapters", chapterRoutes);

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