const express = require("express");
const { User } = require("../db");
const requireAuth = require("../middleware/requireAuth");
const { hashPassword, comparePassword } = require("../lib/auth");

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get("/", requireAuth, (req, res) => {
  res.json(req.user);
});

router.put("/", requireAuth, async (req, res) => {
  const { name, email, bio, currentPassword, newPassword } = req.body || {};
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  let hasUpdates = false;

  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: "Name can't be empty" });
    user.name = name.trim();
    hasUpdates = true;
  }

  if (email !== undefined) {
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "That doesn't look like a valid email" });
    const normalized = email.toLowerCase().trim();
    const clash = await User.findOne({ email: normalized, _id: { $ne: user._id } });
    if (clash) return res.status(409).json({ error: "That email is already in use" });
    user.email = normalized;
    hasUpdates = true;
  }

  if (bio !== undefined) {
    user.bio = bio;
    hasUpdates = true;
  }

  if (newPassword) {
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }
    if (!currentPassword || !comparePassword(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    user.password_hash = hashPassword(newPassword);
    hasUpdates = true;
  }

  if (!hasUpdates) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  await user.save();
  res.json(user.toJSON());
});

module.exports = router;
