const express = require("express");
const { User, AuthEvent } = require("../db");
const { hashPassword, comparePassword, signToken } = require("../lib/auth");
const { recordAuthEvent } = require("../lib/authEvents");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Private audit view for the site operator. Login history must never be
// exposed publicly, so a valid admin key is required.
router.get("/events", adminAuth, async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const events = await AuthEvent.find().sort({ created_at: -1 }).limit(limit).lean();
  res.json(events);
});

// Verify configuration before any account write; otherwise a new user could
// be created but receive no usable session token.
router.use((req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ error: "Authentication is not configured" });
  }
  next();
});

// Verify a Google ID token through Google's token-info endpoint. Directly
// decoding JWT payloads is not verification and would allow impersonation.
async function verifyGoogleIdToken(idToken) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("Google sign-in is not configured");
  }
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) throw new Error("Invalid Google token");
  const data = await res.json();
  if (data.aud !== process.env.GOOGLE_CLIENT_ID || !data.email_verified || !data.email || !data.sub) {
    throw new Error("Invalid Google token");
  }
  return {
    email: data.email,
    name: data.name || data.given_name || data.email.split("@")[0],
    googleId: data.sub,
    avatarUrl: data.picture || null,
  };
}

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
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
      auth_provider: "local",
    });

    const userJson = user.toJSON();
    await recordAuthEvent({ user, email: normalizedEmail, eventType: "signup" });
    res.status(201).json({ token: signToken(userJson), user: userJson });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ error: "An account with that email already exists" });
    console.error("Signup failed:", err.message);
    res.status(500).json({ error: "Could not create account" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !comparePassword(password, user.password_hash)) {
      await recordAuthEvent({ email: email.toLowerCase().trim(), eventType: "login_failure" });
      return res.status(401).json({ error: "Incorrect email or password" });
    }

    const userJson = user.toJSON();
    await recordAuthEvent({ user, email: user.email, eventType: "login_success" });
    res.json({ token: signToken(userJson), user: userJson });
  } catch (err) {
    console.error("Login failed:", err.message);
    res.status(500).json({ error: "Could not log in" });
  }
});

// POST /api/auth/google
// Accepts a verified Google Identity Services credential. Google accounts are
// still given a local password here because the existing profile UI supports
// changing it; it is never accepted as proof of a Google identity.
router.post("/google", async (req, res) => {
  try {
    let email;
    let name;
    let googleId;
    let avatarUrl;
    const password = req.body?.password;

    // If Google ID token was sent from Google Identity Services button
    if (req.body?.credential) {
      const verified = await verifyGoogleIdToken(req.body.credential);
      email = verified.email;
      name = verified.name || name;
      googleId = verified.googleId;
      avatarUrl = verified.avatarUrl || avatarUrl;
    } else {
      return res.status(400).json({ error: "A verified Google credential is required" });
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
      await recordAuthEvent({ user, email: user.email, eventType: "login_success" });
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
    await recordAuthEvent({ user, email: user.email, eventType: "signup" });
    return res.status(201).json({ token: signToken(userJson), user: userJson, isNewUser: true });
  } catch (err) {
    res.status(400).json({ error: err.message || "Google authentication failed" });
  }
});

module.exports = router;
