// Pulls fresh results from each live API client and writes them into MongoDB.
// Each source is isolated: if edX errors out (or isn't configured yet),
// Coursera and Udemy still sync fine, and it's recorded in SyncLog either way.

const { Course, SyncLog } = require("../db");
const coursera = require("./courseraClient");
const edx = require("./edxClient");
const udemy = require("./udemyClient");

async function syncSource(sourceName, fetchFn) {
  try {
    const items = fetchFn ? await fetchFn() : [];

    if (items.length > 0) {
      const ops = items.map((item) => {
        const setFields = {
          title: item.title,
          platform: item.platform,
          access: item.access || null,
          url: item.url,
          source: sourceName,
        };
        if (item.category) setFields.category = item.category;
        if (item.level) setFields.level = item.level;
        if (item.duration) setFields.duration = item.duration;
        if (item.blurb) setFields.blurb = item.blurb;

        return {
          updateOne: {
            filter: { external_id: item.id },
            update: {
              $set: setFields,
              $setOnInsert: {
                external_id: item.id,
                category: item.category || null,
                level: item.level || null,
                duration: item.duration || null,
                blurb: item.blurb || null,
              },
            },
            upsert: true,
          },
        };
      });

      await Course.bulkWrite(ops);
    }

    await SyncLog.create({
      source: sourceName,
      status: "success",
      message: null,
      items_synced: items.length,
      synced_at: new Date(),
    });

    return { source: sourceName, count: items.length };
  } catch (err) {
    await SyncLog.create({
      source: sourceName,
      status: "error",
      message: err.message,
      items_synced: 0,
      synced_at: new Date(),
    });

    return { source: sourceName, count: 0, error: err.message };
  }
}

async function syncAll(query = "") {
  return Promise.all([
    syncSource("coursera", () => coursera.searchCourses(query)),
    syncSource("edx", () => edx.searchCourses(query)),
    syncSource("udemy", () => udemy.searchCourses(query)),
  ]);
}

module.exports = { syncAll, syncSource };
