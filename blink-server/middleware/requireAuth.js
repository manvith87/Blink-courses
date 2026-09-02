// Protects account endpoints. Expects `Authorization: Bearer <token>`.
// On success, attaches the (password-free) user document to req.user.

const { User } = require("../db");
const { verifyToken } = require("../lib/auth");

module.exports = async function requireAuth(req, res, next) {
  const header = req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: "Account no longer exists" });
    }

    req.user = user.toJSON();
    next();
  } catch (err) {
    return res.status(500).json({ error: "Authentication check failed" });
  }
};
