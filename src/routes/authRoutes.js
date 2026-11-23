const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  AuthController,
  me,
  updateProfile,
  entitlement,
  getAvatar,
  uploadAvatar,
} = require("../controllers/AuthController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const uploadDir = path.join(__dirname, "../../uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) =>
      cb(null, `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});


router.post("/login", AuthController.login);
router.post("/social", AuthController.social);
router.post("/refresh", AuthController.refresh);
router.post("/logout", authenticate, AuthController.logout);

// Push registration moved to Appwrite: the mobile app creates its Appwrite
// session directly, no device token reaches this API anymore.

router.get("/me", authenticate, me);
router.put("/profile", authenticate, updateProfile);
router.get("/entitlement", authenticate, entitlement);
router.get("/profile/avatar", authenticate, getAvatar);
router.put("/profile/avatar", authenticate, upload.single("file"), uploadAvatar);

const { OtpController } = require("../controllers/OtpController");

router.post("/otp/request", OtpController.requestOtp);
router.post("/otp/verify", OtpController.verifyOtp);
router.post("/reset-password", OtpController.resetPassword);

module.exports = router;
