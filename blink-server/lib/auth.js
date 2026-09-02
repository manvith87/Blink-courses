// Password hashing + JWT helpers.

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function comparePassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set in .env");
  }
  const id = user.id || (user._id ? user._id.toString() : user.sub);
  return jwt.sign({ sub: id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
}

function verifyToken(token) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set in .env");
  }
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { hashPassword, comparePassword, signToken, verifyToken };
