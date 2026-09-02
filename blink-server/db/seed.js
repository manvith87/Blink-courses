// Loads the hand-curated list (freeCodeCamp, Khan Academy, MIT OCW,
// etc.) into MongoDB. Safe to re-run any time — it upserts on
// external_id, so re-seeding just refreshes those documents.

require("dotenv").config();
const { connectDB, Course, mongoose } = require("./index");
const staticCourses = require("../lib/staticCourses");
const domainsData = require("../lib/domainsData");
const { seedDomains } = require("../lib/seedDomains");

async function seed() {
  await connectDB();

  const ops = staticCourses.map((item) => ({
    updateOne: {
      filter: { external_id: item.id },
      update: {
        $set: {
          external_id: item.id,
          title: item.title,
          platform: item.platform,
          category: item.category,
          level: item.level,
          duration: item.duration,
          access: item.access,
          blurb: item.blurb,
          url: item.url,
          source: "curated",
        },
      },
      upsert: true,
    },
  }));

  await Course.bulkWrite(ops);
  console.log(`Seeded ${staticCourses.length} curated courses into MongoDB.`);

  const { domainCount, skippedCourseIds } = await seedDomains(domainsData);
  console.log(`Seeded ${domainCount} domain roadmaps.`);
  if (skippedCourseIds.length > 0) {
    console.warn("Warning: some roadmap steps referenced course IDs that don't exist yet:");
    skippedCourseIds.forEach((line) => console.warn(`  - ${line}`));
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
