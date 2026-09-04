require("dotenv").config();
const app = require("./app");
const { connectDB } = require("./db");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Blink backend running at http://localhost:${PORT}`);
      console.log(`Courses:  http://localhost:${PORT}/api/courses`);
      console.log(`Status:   http://localhost:${PORT}/api/status`);
    });

    // Background sync scheduler for standalone mode
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

if (require.main === module) {
  startServer();
}

module.exports = app;
