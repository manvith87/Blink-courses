require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { connectDB, Course, SyncLog } = require("./db");
const coursesRouter = require("./routes/courses");
const syncRouter = require("./routes/sync");
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const chatRouter = require("./routes/chat");
const domainsRouter = require("./routes/domains");
const { isConfigured: chatConfigured } = require("./lib/chatService");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// Database connection middleware for serverless invocations
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("[Database Connection Error]:", err.message);
    return res.status(503).json({
      error: "Database unavailable. Configure MONGODB_URI in the hosting environment and try again.",
    });
  }
});

app.get("/api/status", async (req, res) => {
  try {
    const total = await Course.countDocuments();
    const bySource = await Course.aggregate([
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $project: { _id: 0, source: "$_id", count: 1 } },
      { $sort: { count: -1 } },
    ]);
    const recentSyncs = await SyncLog.find().sort({ synced_at: -1 }).limit(10);

    res.json({
      status: "online",
      environment: process.env.NODE_ENV || "development",
      totalCourses: total,
      bySource,
      recentSyncs,
      edxConfigured: require("./lib/edxClient").isConfigured(),
      udemyConfigured: require("./lib/udemyClient").isConfigured(),
      chatConfigured: chatConfigured(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to retrieve server status" });
  }
});

app.use("/api/courses", coursesRouter);
app.use("/api/sync", syncRouter);
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/chat", chatRouter);
app.use("/api/domains", domainsRouter);

app.get("/", (req, res) => {
  res.json({
    message: "Blink Course Directory API is running",
    docs: "/api/courses",
    status: "/api/status",
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

module.exports = app;
