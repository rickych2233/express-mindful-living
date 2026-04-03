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
  host: process.env.DB_HOST || "/var/run/postgresql",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  database: process.env.DB_NAME || "mindful_living",
});

async function initDatabase() {root@srv1231126:/var/www/satyatech/express-mindful-living# sed -n '1,80p' index.js
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
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "mindful_living",
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
    const chaptersResult = await pool.query(`
      SELECT
        id,
        chapter_order,
        chapter_order AS "order",
        title,
        title AS name,
        title AS chapter_name,
        description,
        status,
        created_at
      FROM chapters
      ORDER BY chapter_order ASC, id ASC
    `);

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

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "name, email, dan password wajib diisi",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "password minimal 6 karakter",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rowCount > 0) {
      return res.status(409).json({
        message: "email sudah terdaftar",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const insertResult = await pool.query(
      `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, donation_amount, created_at
      `,
      [name.trim(), normalizedEmail, passwordHash]
    );

    return res.status(201).json({
      message: "register berhasil",
      user: insertResult.rows[0],
    });
  } catch (error) {
    console.error("REGISTER_ERROR", error);
    return res.status(500).json({
      message: "terjadi kesalahan server",
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "email dan password wajib diisi",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const userResult = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({
        message: "email atau password salah",
      });
    }

    const user = userResult.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "email atau password salah",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET || "development-secret",
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "login berhasil",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("LOGIN_ERROR", error);
    return res.status(500).json({
      message: "terjadi kesalahan server",
    });
  }
});

app.use((err, req, res, next) => {
  console.error("UNHANDLED_ERROR", err);
  res.status(500).json({
    message: "terjadi kesalahan server",
  });
});

(async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("FAILED_TO_START_SERVER", error);
    process.exit(1);
  }
})();
