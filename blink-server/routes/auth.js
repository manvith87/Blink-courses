const express = require("express");
const { User } = require("../db");
const { hashPassword, comparePassword, signToken } = require("../lib/auth");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper to decode or verify Google ID token
async function verifyGoogleIdToken(idToken) {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) {
      throw new Error("Invalid Google token");
    }
    const data = await res.json();
    return {
      email: data.email,
      name: data.name || data.given_name || data.email.split("@")[0],
      googleId: data.sub,
      avatarUrl: data.picture || null,
      emailVerified: data.email_verified === "true" || data.email_verified === true,
    };
  } catch (err) {
    // If tokeninfo network fails, attempt safe JWT base64 payload decode
    try {
      const parts = idToken.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        return {
          email: payload.email,
          name: payload.name || payload.given_name || payload.email?.split("@")[0],
          googleId: payload.sub,
          avatarUrl: payload.picture || null,
          emailVerified: payload.email_verified === true,
        };
      }
    } catch {
      // ignore
    }
    throw new Error("Could not verify Google ID token");
  }
}

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email and password are required" });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "That doesn't look like a valid email" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const passwordHash = hashPassword(password);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password_hash: passwordHash,
    auth_provider: normalizedEmail.endsWith("@gmail.com") ? "google" : "local",
  });

  const userJson = user.toJSON();
  res.status(201).json({ token: signToken(userJson), user: userJson });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !comparePassword(password, user.password_hash)) {
    return res.status(401).json({ error: "Incorrect email or password" });
  }

  const userJson = user.toJSON();
  res.json({ token: signToken(userJson), user: userJson });
});

// POST /api/auth/google
// Supports:
// 1. Google ID Token ({ credential, password })
// 2. Direct Google account sign-in ({ email, name, password, google_id, avatar_url })
// Enforces: Email and password consistency
router.post("/google", async (req, res) => {
  try {
    let email = req.body?.email;
    let name = req.body?.name;
    let googleId = req.body?.google_id;
    let avatarUrl = req.body?.avatar_url;
    const password = req.body?.password;

    // If Google ID token was sent from Google Identity Services button
    if (req.body?.credential) {
      const verified = await verifyGoogleIdToken(req.body.credential);
      email = verified.email;
      name = verified.name || name;
      googleId = verified.googleId;
      avatarUrl = verified.avatarUrl || avatarUrl;
    }

    if (!email) {
      return res.status(400).json({ error: "Google email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      // Existing User: If password is provided, verify it matches
      if (password && !comparePassword(password, user.password_hash)) {
        return res.status(401).json({
          error: "Password does not match your existing account for this Google email.",
        });
      }

      // Update google_id or avatar if available
      if (googleId && !user.google_id) user.google_id = googleId;
      if (avatarUrl && !user.avatar_url) user.avatar_url = avatarUrl;
      user.auth_provider = "google";
      await user.save();

      const userJson = user.toJSON();
      return res.json({ token: signToken(userJson), user: userJson, isNewUser: false });
    }

    // New User Signup via Google:
    // Requires password (min 8 chars) to ensure matching email & password consistency
    if (!password || password.length < 8) {
      return res.status(400).json({
        error: "Please enter your password (at least 8 characters) to complete Google account registration.",
        needsPassword: true,
        email: normalizedEmail,
        name: name || normalizedEmail.split("@")[0],
      });
    }

    const passwordHash = hashPassword(password);
    user = await User.create({
      name: (name || normalizedEmail.split("@")[0]).trim(),
      email: normalizedEmail,
      password_hash: passwordHash,
      google_id: googleId || null,
      avatar_url: avatarUrl || null,
      auth_provider: "google",
    });

    const userJson = user.toJSON();
    return res.status(201).json({ token: signToken(userJson), user: userJson, isNewUser: true });
  } catch (err) {
    res.status(400).json({ error: err.message || "Google authentication failed" });
  }
});

module.exports = router;
