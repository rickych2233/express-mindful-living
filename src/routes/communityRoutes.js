const express = require("express");
const Discussion = require("../models/Discussion");
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

module.exports = router;
