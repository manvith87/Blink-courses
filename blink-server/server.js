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
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

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

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Blink backend running at http://localhost:${PORT}`);
      console.log(`Courses:  http://localhost:${PORT}/api/courses`);
      console.log(`Status:   http://localhost:${PORT}/api/status`);
    });

    // Optional background refresh — set SYNC_INTERVAL_MINUTES in .env to
    // enable. Leave unset (or 0) to only sync via `npm run sync` or the
    // POST /api/sync endpoint.
    const intervalMinutes = Number(process.env.SYNC_INTERVAL_MINUTES || 0);
    if (intervalMinutes > 0) {
      const { syncAll } = require("./lib/syncService");
      console.log(`Background sync enabled: every ${intervalMinutes} minute(s).`);
      setInterval(() => {
        syncAll()
          .then((results) => console.log("[scheduled sync]", results))
          .catch((err) => console.error("[scheduled sync] failed:", err.message));
      }, intervalMinutes * 60 * 1000);
    }
  } catch (err) {
    console.error("Failed to start Blink server:", err);
    process.exit(1);
  }
}

startServer();
