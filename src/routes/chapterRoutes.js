const express = require("express");
const ChapterController = require("../controllers/ChapterController");
const SectionController = require("../controllers/SectionController");

const router = express.Router();

// Chapter collection routes
router.post("/", ChapterController.createChapter);
router.get("/", ChapterController.getAllChapters);
router.patch("/reorder", ChapterController.reorderChapters);

// Section routes (must be BEFORE /:id to avoid Express 5 route conflicts)
router.get("/:chapterId/sections", SectionController.getSectionsByChapter);
router.post("/:chapterId/sections", SectionController.createSection);
router.put("/:chapterId/sections/:id", SectionController.updateSection);
router.delete("/:chapterId/sections/:id", SectionController.deleteSection);
router.patch("/:chapterId/sections/:id/toggle-status", SectionController.toggleSectionStatus);

// Chapter single-item routes
router.get("/:id", ChapterController.getChapterById);
router.put("/:id", ChapterController.updateChapter);
router.delete("/:id", ChapterController.deleteChapter);
router.patch("/:id/toggle-status", ChapterController.toggleChapterStatus);
router.patch("/:id/status", ChapterController.setChapterStatus);

module.exports = router;
