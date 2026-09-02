const express = require("express");
const { getChatReply, isConfigured } = require("../lib/chatService");

const router = express.Router();

// POST /api/chat  { message: "...", history: [{role, content}, ...] }
// No auth required — this is meant for anonymous site visitors.
router.post("/", async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({
      error: "Chat isn't configured on this server yet (ANTHROPIC_API_KEY is missing).",
    });
  }

  const { message, history } = req.body || {};

  try {
    const result = await getChatReply(message, Array.isArray(history) ? history : []);
    res.json(result);
  } catch (err) {
    const isUserError = /empty|too long|not configured/i.test(err.message);
    res.status(isUserError ? 400 : 502).json({ error: err.message });
  }
});

module.exports = router;
