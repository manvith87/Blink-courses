const mongoose = require("mongoose");
const Course = require("../models/Course");
const User = require("../models/User");
const SyncLog = require("../models/SyncLog");
const Domain = require("../models/Domain");
const CourseClick = require("../models/CourseClick");
const AuthEvent = require("../models/AuthEvent");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/blink";

let cachedConnection = null;

async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (!cachedConnection) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
    };

    cachedConnection = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        console.log(`Connected to MongoDB at ${MONGODB_URI.replace(/\/\/.*@/, "//<credentials>@")}`);
        return m.connection;
      })
      .catch((err) => {
        cachedConnection = null;
        console.error("MongoDB connection error:", err.message);
        throw err;
      });
  }

  return cachedConnection;
}

module.exports = {
  connectDB,
  mongoose,
  Course,
  User,
  SyncLog,
  Domain,
  CourseClick,
  AuthEvent,
};
