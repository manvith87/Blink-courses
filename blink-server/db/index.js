const mongoose = require("mongoose");
const Course = require("../models/Course");
const User = require("../models/User");
const SyncLog = require("../models/SyncLog");
const Domain = require("../models/Domain");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/blink";

let connectionPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(MONGODB_URI)
      .then((m) => {
        console.log(`Connected to MongoDB at ${MONGODB_URI}`);
        return m.connection;
      })
      .catch((err) => {
        connectionPromise = null;
        console.error("MongoDB connection error:", err.message);
        throw err;
      });
  }

  return connectionPromise;
}

module.exports = {
  connectDB,
  mongoose,
  Course,
  User,
  SyncLog,
  Domain,
};
