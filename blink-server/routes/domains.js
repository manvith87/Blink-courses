const express = require("express");
const { Domain } = require("../db");

const router = express.Router();

// GET /api/domains — list every domain with a quick step/course count,
// for rendering the "pick a domain" chips.
router.get("/", async (req, res) => {
  try {
    const domains = await Domain.find().sort({ name: 1 });

    const withCounts = domains.map((domain) => {
      const doc = domain.toJSON();
      const stepCount = (domain.steps || []).length;
      const uniqueCourseIds = new Set();
      (domain.steps || []).forEach((step) => {
        (step.courses || []).forEach((c) => {
          if (c) uniqueCourseIds.add(c.toString());
        });
      });
      const courseCount = uniqueCourseIds.size;
      return {
        ...doc,
        stepCount,
        courseCount,
      };
    });

    res.json(withCounts);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch domains" });
  }
});

// GET /api/domains/:slug — the full roadmap: ordered steps, each with
// its actual course documents attached.
router.get("/:slug", async (req, res) => {
  try {
    const domain = await Domain.findOne({ slug: req.params.slug }).populate("steps.courses");
    if (!domain) return res.status(404).json({ error: "Domain not found" });

    const doc = domain.toJSON();
    const sortedSteps = (doc.steps || []).sort((a, b) => a.step_order - b.step_order);

    res.json({
      ...doc,
      steps: sortedSteps,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch domain roadmap" });
  }
});

module.exports = router;
