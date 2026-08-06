const express = require("express");
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

router.post("/", async (req, res) => {
  try {
    const resource = await Resource.create(req.body);
    res.status(201).json(resource);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const resource = await Resource.update(req.params.id, req.body);
    if (!resource) return res.status(404).json({ message: "Resource not found" });
    res.json(resource);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
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
