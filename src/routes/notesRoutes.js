const express = require("express");
const router = express.Router();
const { getNotes, getBookmarks, getCategories, createCategory, updateCategory, deleteCategory } = require("../controllers/notesController");

router.get("/notes", getNotes);
router.get("/bookmarks", getBookmarks);
router.get("/note-categories", getCategories);
router.post("/note-categories", createCategory);
router.put("/note-categories/:id", updateCategory);
router.delete("/note-categories/:id", deleteCategory);

module.exports = router;
