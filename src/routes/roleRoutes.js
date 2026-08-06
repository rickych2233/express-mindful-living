const express = require("express");
const RoleController = require("../controllers/RoleController");

const router = express.Router();

// Collection
router.get("/", RoleController.list);
router.post("/", RoleController.create);

// Permission catalog (literal path MUST be before /:id for Express 5)
router.get("/permissions/catalog", RoleController.getPermissionsCatalog);

// Single role
router.get("/:id", RoleController.getById);
router.put("/:id", RoleController.update);
router.delete("/:id", RoleController.delete);

// Nested resources under a role
router.put("/:id/permissions", RoleController.setPermissions);
router.put("/:id/users", RoleController.setUsers);
router.post("/:id/users", RoleController.assignUser);
router.delete("/:id/users/:userId", RoleController.removeUser);

module.exports = router;
