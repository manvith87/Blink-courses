// Seeds domains + their ordered steps + referenced courses into MongoDB.
// Must run AFTER courses are seeded in the database.
// Re-runnable: each domain is updated/upserted from domainsData.js.

const { Domain, Course } = require("../db");

async function seedDomains(domainsData) {
  const skippedCourseIds = [];

  // Fetch all courses mapped by external_id for fast lookup
  const allCourses = await Course.find({}, { _id: 1, external_id: 1 }).lean();
  const courseMap = new Map();
  allCourses.forEach((c) => {
    courseMap.set(c.external_id, c._id);
  });

  for (const domain of domainsData) {
    const formattedSteps = [];

    domain.steps.forEach((step, index) => {
      const resolvedCourseIds = [];

      step.courseIds.forEach((externalId) => {
        const courseMongoId = courseMap.get(externalId);
        if (!courseMongoId) {
          skippedCourseIds.push(`${domain.slug} -> "${step.title}" -> ${externalId}`);
          return;
        }
        resolvedCourseIds.push(courseMongoId);
      });

      formattedSteps.push({
        step_order: index + 1,
        title: step.title,
        description: step.description || "",
        courses: resolvedCourseIds,
      });
    });

    await Domain.findOneAndUpdate(
      { slug: domain.slug },
      {
        slug: domain.slug,
        name: domain.name,
        description: domain.description || "",
        steps: formattedSteps,
      },
      { upsert: true, new: true, runValidators: true }
    );
  }

  return { domainCount: domainsData.length, skippedCourseIds };
}

module.exports = { seedDomains };
