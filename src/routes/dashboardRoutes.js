const express = require("express");
const DashboardController = require("../controllers/DashboardController");
const router = express.Router();

router.get("/stats", DashboardController.getStats);

module.exports = router;
