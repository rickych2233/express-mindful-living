const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const adminOnly = [authenticate, authorize("admin")];

const ChapterController = require("../controllers/ChapterController");
const SectionController = require("../controllers/SectionController");

const router = express.Router();

// Chapter collection routes
router.post("/", adminOnly, ChapterController.createChapter);
router.get("/", ChapterController.getAllChapters);
router.patch("/reorder", adminOnly, ChapterController.reorderChapters);
router.put("/:id/sections/reorder", adminOnly, ChapterController.reorderSections);

// Section routes (must be BEFORE /:id to avoid Express 5 route conflicts)
router.get("/:chapterId/sections", SectionController.getSectionsByChapter);
router.post("/:chapterId/sections", adminOnly, SectionController.createSection);
router.put("/:chapterId/sections/:id", adminOnly, SectionController.updateSection);
router.delete("/:chapterId/sections/:id", adminOnly, SectionController.deleteSection);
router.patch("/:chapterId/sections/:id/toggle-status", adminOnly, SectionController.toggleSectionStatus);

// Chapter single-item routes
router.get("/:id", ChapterController.getChapterById);
router.put("/:id", adminOnly, ChapterController.updateChapter);
router.delete("/:id", adminOnly, ChapterController.deleteChapter);
router.patch("/:id/toggle-status", adminOnly, ChapterController.toggleChapterStatus);
router.patch("/:id/status", adminOnly, ChapterController.setChapterStatus);

module.exports = router;
