const express = require("express");
const { pool } = require("../config/database");
const { authenticate } = require("../middleware/auth");

const router = express.Router();


async function ensureProgressTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_progress (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      chapter_id INTEGER NOT NULL,
      section_id VARCHAR(64) NOT NULL DEFAULT '',
      completed BOOLEAN NOT NULL DEFAULT false,
      watched_seconds INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, chapter_id, section_id)
    )
  `);
}

// All progress rows of the caller.
router.get("/", authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT chapter_id, section_id, completed, watched_seconds, updated_at
       FROM user_progress WHERE user_id = $1 ORDER BY updated_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Upsert one progress entry; ownership comes from the token.
router.put("/", authenticate, async (req, res) => {
  try {
    const { chapter_id, section_id = "", completed, watched_seconds } =
      req.body || {};
    if (chapter_id === undefined || chapter_id === null) {
      return res.status(400).json({ message: "chapter_id harus diisi" });
    }
    const { rows } = await pool.query(
      `INSERT INTO user_progress (user_id, chapter_id, section_id, completed, watched_seconds)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, chapter_id, section_id) DO UPDATE SET
         completed = EXCLUDED.completed,
         watched_seconds = GREATEST(user_progress.watched_seconds, EXCLUDED.watched_seconds),
         updated_at = NOW()
       RETURNING *`,
      [
        req.user.id,
        Number(chapter_id),
        String(section_id),
        Boolean(completed),
        Number(watched_seconds) || 0,
      ],
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = { router, ensureProgressTable };
