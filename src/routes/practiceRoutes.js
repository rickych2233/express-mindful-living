const express = require("express");
const Practice = require("../models/Practice");
const PracticeCategory = require("../models/PracticeCategory");
const router = express.Router();

// Categories routes
router.get("/categories", async (req, res) => {
  try {
    const categories = await PracticeCategory.findAll();
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const category = await PracticeCategory.create(req.body.name);
    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/categories/reorder", async (req, res) => {
  try {
    const { categoryIds } = req.body;
    if (!Array.isArray(categoryIds)) {
      return res.status(400).json({ message: "categoryIds must be an array" });
    }
    await PracticeCategory.reorder(categoryIds);
    res.json({ message: "Categories reordered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/categories/:id", async (req, res) => {
  try {
    const category = await PracticeCategory.update(req.params.id, req.body.name);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    const category = await PracticeCategory.delete(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

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

router.put("/reorder", async (req, res) => {
  try {
    const { practiceIds } = req.body;
    if (!Array.isArray(practiceIds)) {
      return res.status(400).json({ message: "practiceIds must be an array" });
    }
    await Practice.reorder(practiceIds);
    res.json({ message: "Practices reordered successfully" });
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
