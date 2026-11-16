const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const adminOnly = [authenticate, authorize("admin")];

const Resource = require("../models/Resource");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const resources = await Resource.findAll(req.query);
    res.json(resources);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", adminOnly, async (req, res) => {
  try {
    const resource = await Resource.create(req.body);
    res.status(201).json(resource);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", adminOnly, async (req, res) => {
  try {
    const resource = await Resource.update(req.params.id, req.body);
    if (!resource) return res.status(404).json({ message: "Resource not found" });
    res.json(resource);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// User-submitted resource suggestions land as Drafted rows the admin
// reviews; body { title, link }.
router.post("/suggest", authenticate, async (req, res) => {
  try {
    const { title, link } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "title harus diisi" });
    }
    const { pool } = require("../config/database");
    const { rows } = await pool.query(
      `INSERT INTO resources (title, caption, category, status, content_type)
       VALUES ($1, $2, 'Suggested', 'Suggested', 'Link') RETURNING *`,
      [String(title).trim(), link || null],
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


// Issue reports from the mobile app (audio/video/text/download/other).
router.post("/reports", authenticate, async (req, res) => {
  try {
    const { type, message } = req.body || {};
    if (!type) return res.status(400).json({ message: "type harus diisi" });
    const { pool } = require("../config/database");
    await pool.query(
      `CREATE TABLE IF NOT EXISTS issue_reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    );
    const { rows } = await pool.query(
      `INSERT INTO issue_reports (user_id, type, message)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, type, message || null],
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", adminOnly, async (req, res) => {
  try {
    const resource = await Resource.delete(req.params.id);
    if (!resource) return res.status(404).json({ message: "Resource not found" });
    res.json(resource);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
