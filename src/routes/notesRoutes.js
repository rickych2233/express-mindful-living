const express = require("express");
const {
  getNotes,
  getBookmarks,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createNote,
  updateNote,
  deleteNote,
  createBookmark,
  deleteBookmark,
  attachUser,
} = require("../controllers/notesController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Optional auth: tokens present scope the listing to that user.
router.get("/notes", attachUser, getNotes);
router.get("/bookmarks", attachUser, getBookmarks);
router.get("/note-categories", getCategories);

// Category management stays behind admin for now (admin web owns it).
router.post("/note-categories", authenticate, createCategory);
router.put("/note-categories/:id", authenticate, updateCategory);
router.delete("/note-categories/:id", authenticate, deleteCategory);

// Mobile note + bookmark writes, always user-scoped.
router.post("/notes", authenticate, createNote);
router.put("/notes/:id", authenticate, updateNote);
router.delete("/notes/:id", authenticate, deleteNote);
router.post("/bookmarks", authenticate, createBookmark);
router.delete("/bookmarks/:id", authenticate, deleteBookmark);

module.exports = router;
