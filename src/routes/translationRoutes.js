const express = require("express");
const router = express.Router();
const TranslationController = require("../controllers/TranslationController");

router.post("/", TranslationController.translateText);

module.exports = router;
