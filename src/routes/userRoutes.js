const express = require("express");
const UserController = require("../controllers/UserController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// Public: mobile registration + login happens via /api/auth.
router.post("/", UserController.createUser);

// Admin-only user management.
const adminOnly = [authenticate, authorize("admin")];
router.get("/", adminOnly, UserController.getAllUsers);
router.get("/:id", adminOnly, UserController.getUserById);
router.put("/:id", adminOnly, UserController.updateUser);
router.delete("/:id", adminOnly, UserController.deleteUser);
router.patch("/:id/toggle-active", adminOnly, UserController.toggleUserActive);
router.patch("/:id/active", adminOnly, UserController.setUserActive);

module.exports = router;