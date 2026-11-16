const express = require("express");
const Discussion = require("../models/Discussion");
const CommunityCategory = require("../models/CommunityCategory");
const DiscussionReply = require("../models/DiscussionReply");
const ReportedDiscussion = require("../models/ReportedDiscussion");
const { pool } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");
const router = express.Router();

const adminOnly = [authenticate, authorize("admin")];

async function ownsDiscussion(req, res, next) {
  const { rows } = await pool.query(
    "SELECT id FROM discussions WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id],
  );
  if (rows.length === 0) {
    return res.status(404).json({ message: "Discussion not found" });
  }
  next();
}

async function ownsReply(req, res, next) {
  const { rows } = await pool.query(
    "SELECT id FROM discussion_replies WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id],
  );
  if (rows.length === 0) {
    return res.status(404).json({ message: "Reply not found" });
  }
  next();
}

router.get("/discussions", async (req, res) => {
  try {
    const discussions = await Discussion.findAll(req.query);
    res.json(discussions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/discussions", authenticate, async (req, res) => {
  try {
    const { message, category, category_color, resonated } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: "message harus diisi" });
    }
    const discussion = await Discussion.create({
      name: req.user.name || req.user.email,
      avatar: null,
      message: String(message).trim(),
      date: new Date().toISOString(),
      category,
      category_color,
      resonated: resonated || 0,
      user_id: req.user.id,
    });
    res.status(201).json(discussion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/discussions/:id", authenticate, ownsDiscussion, async (req, res) => {
  try {
    // Only content fields are editable, never ownership fields.
    const { message, category, category_color, resonated } = req.body || {};
    const discussion = await Discussion.update(req.params.id, {
      message, category, category_color, resonated,
    });
    if (!discussion) return res.status(404).json({ message: "Discussion not found" });
    res.json(discussion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/discussions/:id", authenticate, ownsDiscussion, async (req, res) => {
  try {
    const discussion = await Discussion.delete(req.params.id);
    if (!discussion) return res.status(404).json({ message: "Discussion not found" });
    res.json(discussion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Categories Routes
router.get("/categories", async (req, res) => {
  try {
    const categories = await CommunityCategory.findAll();
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const category = await CommunityCategory.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/categories/:id", async (req, res) => {
  try {
    const category = await CommunityCategory.update(req.params.id, req.body);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    const category = await CommunityCategory.delete(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Replies Routes
router.get("/replies", async (req, res) => {
  try {
    const replies = await DiscussionReply.findAll(req.query.discussion_id);
    res.json(replies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Missing until now: mobile sends replies through here.
router.post("/replies", authenticate, async (req, res) => {
  try {
    const { discussion_id, message } = req.body || {};
    if (!discussion_id || !message || !String(message).trim()) {
      return res
        .status(400)
        .json({ message: "discussion_id dan message harus diisi" });
    }
    const reply = await DiscussionReply.create({
      discussion_id,
      name: req.user.name || req.user.email,
      avatar: null,
      message: String(message).trim(),
      date: new Date().toISOString(),
      status: "Visible",
      user_id: req.user.id,
    });
    res.status(201).json(reply);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/replies/:id", authenticate, ownsReply, async (req, res) => {
  try {
    const { message } = req.body || {};
    const reply = await DiscussionReply.update(req.params.id, { message });
    if (!reply) return res.status(404).json({ message: "Reply not found" });
    res.json(reply);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/replies/:id", authenticate, ownsReply, async (req, res) => {
  try {
    const reply = await DiscussionReply.delete(req.params.id);
    if (!reply) return res.status(404).json({ message: "Reply not found" });
    res.json(reply);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Reported Discussions Routes
router.get("/reported", async (req, res) => {
  try {
    const reported = await ReportedDiscussion.findAll();
    res.json(reported);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/reported/:id", async (req, res) => {
  try {
    const reported = await ReportedDiscussion.update(req.params.id, req.body);
    if (!reported) return res.status(404).json({ message: "Reported item not found" });
    res.json(reported);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
