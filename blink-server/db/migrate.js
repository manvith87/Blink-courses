// Runs index creation and migration in MongoDB.
// Usage: `npm run migrate`

require("dotenv").config();
const { connectDB, Course, User, SyncLog, Domain, CourseClick, AuthEvent, mongoose } = require("./index");

async function migrate() {
  console.log("Connecting to MongoDB for migration...");
  await connectDB();

  console.log("Syncing indexes for Course, User, SyncLog, Domain, CourseClick, AuthEvent...");
  await Course.syncIndexes();
  await User.syncIndexes();
  await SyncLog.syncIndexes();
  await Domain.syncIndexes();
  await CourseClick.syncIndexes();
  await AuthEvent.syncIndexes();

  console.log("Migration complete — MongoDB schemas and indexes are up to date.");
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
