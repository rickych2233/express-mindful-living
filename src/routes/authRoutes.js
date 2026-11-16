const express = require("express");
const { AuthController, me } = require("../controllers/AuthController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", authenticate, AuthController.logout);
router.get("/me", authenticate, me);

const { OtpController } = require("../controllers/OtpController");

router.post("/otp/request", OtpController.requestOtp);
router.post("/otp/verify", OtpController.verifyOtp);
router.post("/reset-password", OtpController.resetPassword);

module.exports = router;
