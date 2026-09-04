const express = require("express");
const { getChatReply, getProviderInfo } = require("../lib/chatService");

const router = express.Router();

// GET /api/chat/status - inspect the active AI provider
router.get("/status", (req, res) => {
  res.json(getProviderInfo());
});

// POST /api/chat  { message: "...", history: [{role, content}, ...] }
// No auth required — this is meant for site visitors.
router.post("/", async (req, res) => {
  const { message, history } = req.body || {};

  try {
    const result = await getChatReply(message, Array.isArray(history) ? history : []);
    res.json(result);
  } catch (err) {
    const isUserError = /empty|too long/i.test(err.message);
    res.status(isUserError ? 400 : 500).json({ error: err.message || "Failed to generate chat response" });
  }
});

module.exports = router;
