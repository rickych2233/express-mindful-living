const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const adminOnly = [authenticate, authorize("admin")];

const MediaFile = require("../models/MediaFile");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const mediaFiles = await MediaFile.findAll(req.query);
    res.json(mediaFiles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", adminOnly, async (req, res) => {
  try {
    const mediaFile = await MediaFile.create(req.body);
    res.status(201).json(mediaFile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", adminOnly, async (req, res) => {
  try {
    const mediaFile = await MediaFile.update(req.params.id, req.body);
    if (!mediaFile) return res.status(404).json({ message: "Media file not found" });
    res.json(mediaFile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", adminOnly, async (req, res) => {
  try {
    const mediaFile = await MediaFile.delete(req.params.id);
    if (!mediaFile) return res.status(404).json({ message: "Media file not found" });
    res.json(mediaFile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
