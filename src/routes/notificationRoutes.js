const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const {
  appwriteReady,
  notifyUser,
  sendPush,
  getAppwriteIds,
  getAllAppwriteIds,
} = require("../services/appwrite");

const router = express.Router();
const adminOnly = [authenticate, authorize("admin")];

/**
 * POST /api/notifications/send — admin push via Appwrite Messaging.
 * Body: { title, body, userId? } — without userId, sends to every user
 * that has logged in on the app (has an appwrite_id).
 */
router.post("/send", ...adminOnly, async (req, res) => {
  const { title, body, userId } = req.body || {};
  if (!title?.trim() || !body?.trim()) {
    return res.status(400).json({ message: "title dan body harus diisi" });
  }
  if (!appwriteReady()) {
    return res
      .status(503)
      .json({ message: "push notification belum dikonfigurasi di server" });
  }
  const payload = { title: title.trim(), body: body.trim(), data: { type: "broadcast" } };
  const result = userId
    ? await notifyUser(Number(userId), payload)
    : await sendPush(await getAllAppwriteIds(), payload);
  res.json({ ...result, requested: userId ? "user" : "all" });
});

module.exports = router;
