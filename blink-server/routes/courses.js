const express = require("express");
const mongoose = require("mongoose");
const { Course } = require("../db");
const adminAuth = require("../middleware/adminAuth");
const slugify = require("../lib/slugify");

const router = express.Router();

function getCourseQuery(id) {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return { $or: [{ _id: id }, { external_id: id }] };
  }
  return { external_id: id };
}

// GET /api/courses?platform=Coursera&category=Programming&q=python&page=1&limit=24
router.get("/", async (req, res) => {
  try {
    const { platform, category, q } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const offset = (page - 1) * limit;

    const filter = {};

    if (platform && platform.toLowerCase() !== "all") {
      filter.platform = { $regex: new RegExp(`^${platform}$`, "i") };
    }
    if (category && category.toLowerCase() !== "all") {
      filter.category = { $regex: new RegExp(`^${category}$`, "i") };
    }
    if (q) {
      const qRegex = new RegExp(q.trim(), "i");
      filter.$or = [
        { title: qRegex },
        { blurb: qRegex },
        { platform: qRegex },
        { category: qRegex },
      ];
    }

    const [results, count] = await Promise.all([
      Course.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip(offset)
        .limit(limit),
      Course.countDocuments(filter),
    ]);

    res.json({ count, page, limit, results });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch courses" });
  }
});

router.get("/platforms", async (req, res) => {
  try {
    const platforms = await Course.distinct("platform");
    res.json(platforms.filter(Boolean).sort());
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch platforms" });
  }
});

router.get("/categories", async (req, res) => {
  try {
    const categories = await Course.distinct("category", { category: { $ne: null } });
    res.json(categories.filter(Boolean).sort());
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch categories" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const course = await Course.findOne(getCourseQuery(req.params.id));
    if (!course) return res.status(404).json({ error: "Course not found" });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch course" });
  }
});

// POST /api/courses (requires x-admin-key header)
router.post("/", adminAuth, async (req, res) => {
  try {
    const { title, platform, category, level, duration, access, blurb, url } = req.body || {};

    if (!title || !platform || !url) {
      return res.status(400).json({ error: "title, platform and url are required" });
    }

    const externalId = req.body.external_id || `manual-${slugify(platform)}-${slugify(title)}`;

    const course = await Course.findOneAndUpdate(
      { external_id: externalId },
      {
        external_id: externalId,
        title,
        platform,
        category: category || null,
        level: level || null,
        duration: duration || null,
        access: access || null,
        blurb: blurb || null,
        url,
        source: "manual",
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to create/update course" });
  }
});

// PUT /api/courses/:id (requires x-admin-key header)
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const course = await Course.findOne(getCourseQuery(req.params.id));
    if (!course) return res.status(404).json({ error: "Course not found" });

    const editable = ["title", "platform", "category", "level", "duration", "access", "blurb", "url"];
    let updatedCount = 0;

    editable.forEach((field) => {
      if (req.body[field] !== undefined) {
        course[field] = req.body[field];
        updatedCount++;
      }
    });

    if (updatedCount === 0) {
      return res.status(400).json({ error: "No editable fields provided" });
    }

    await course.save();
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to update course" });
  }
});

// DELETE /api/courses/:id (requires x-admin-key header)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const result = await Course.deleteOne(getCourseQuery(req.params.id));
    if (result.deletedCount === 0) return res.status(404).json({ error: "Course not found" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to delete course" });
  }
});

module.exports = router;
