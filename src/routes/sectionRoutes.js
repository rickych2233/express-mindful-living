const express = require("express");
const SectionController = require("../controllers/SectionController");

const router = express.Router({ mergeParams: true });

router.get("/:chapterId/sections", SectionController.getSectionsByChapter);
router.post("/:chapterId/sections", SectionController.createSection);
router.put("/:chapterId/sections/:id", SectionController.updateSection);
router.delete("/:chapterId/sections/:id", SectionController.deleteSection);
router.patch("/:chapterId/sections/:id/toggle-status", SectionController.toggleSectionStatus);

module.exports = router;
