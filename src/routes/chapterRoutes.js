const express = require("express");
const ChapterController = require("../controllers/ChapterController");

const router = express.Router();

router.post("/", ChapterController.createChapter);
router.get("/", ChapterController.getAllChapters);
router.get("/:id", ChapterController.getChapterById);
router.put("/:id", ChapterController.updateChapter);
router.delete("/:id", ChapterController.deleteChapter);
router.patch("/:id/toggle-status", ChapterController.toggleChapterStatus);
router.patch("/:id/status", ChapterController.setChapterStatus);

module.exports = router;
