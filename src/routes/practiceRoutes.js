const express = require("express");
const Practice = require("../models/Practice");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const practices = await Practice.findAll(req.query);
    res.json(practices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const practice = await Practice.create(req.body);
    res.status(201).json(practice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const practice = await Practice.update(req.params.id, req.body);
    if (!practice) return res.status(404).json({ message: "Practice not found" });
    res.json(practice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const practice = await Practice.delete(req.params.id);
    if (!practice) return res.status(404).json({ message: "Practice not found" });
    res.json(practice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
