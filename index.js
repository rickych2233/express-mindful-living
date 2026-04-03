const express = require("express");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

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

const pool = new Pool({
  host: "127.0.0.1",
  port: 5432,
  user: "mindful_app",
  password: "mindful123",
  database: "mindful_living",
});

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      donation_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS donation_amount NUMERIC(12,2) NOT NULL DEFAULT 0
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chapters (
      id SERIAL PRIMARY KEY,
      chapter_order INTEGER NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Published',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

app.get("/", (req, res) => {
  res.send("API auth Express + PostgreSQL aktif");
});

app.get("/users", async (req, res) => {
  try {
    const usersResult = await pool.query(
      "SELECT id, name, email, donation_amount, created_at FROM users ORDER BY created_at DESC"
    );

    return res.status(200).json({
      message: "data users berhasil diambil",
      users: usersResult.rows,
    });
  } catch (error) {
    console.error("GET_USERS_ERROR", error);
    return res.status(500).json({
      message: "terjadi kesalahan server",
    });
  }
});

app.get("/chapters", async (req, res) => {
  try {
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