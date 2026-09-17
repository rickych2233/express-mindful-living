const express = require("express");
const Discussion = require("../models/Discussion");
const CommunityCategory = require("../models/CommunityCategory");
const DiscussionReply = require("../models/DiscussionReply");
const ReportedDiscussion = require("../models/ReportedDiscussion");
const router = express.Router();

router.get("/discussions", async (req, res) => {
  try {
    const discussions = await Discussion.findAll(req.query);
    res.json(discussions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/discussions", async (req, res) => {
  try {
    const discussion = await Discussion.create(req.body);
    res.status(201).json(discussion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/discussions/:id", async (req, res) => {
  try {
    const discussion = await Discussion.update(req.params.id, req.body);
    if (!discussion) return res.status(404).json({ message: "Discussion not found" });
    res.json(discussion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/discussions/:id", async (req, res) => {
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

router.put("/replies/:id", async (req, res) => {
  try {
    const reply = await DiscussionReply.update(req.params.id, req.body);
    if (!reply) return res.status(404).json({ message: "Reply not found" });
    res.json(reply);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/replies/:id", async (req, res) => {
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
