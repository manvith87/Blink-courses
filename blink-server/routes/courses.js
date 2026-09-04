const express = require("express");
const mongoose = require("mongoose");
const { Course, CourseClick, User } = require("../db");
const adminAuth = require("../middleware/adminAuth");
const slugify = require("../lib/slugify");
const { verifyToken } = require("../lib/auth");

const router = express.Router();

function getCourseQuery(id) {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return { $or: [{ _id: id }, { external_id: id }] };
  }
  return { external_id: id };
}

// Helper to optionally extract user from Authorization header
async function getOptionalUser(req) {
  try {
    const header = req.header("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload?.sub) return null;
    return await User.findById(payload.sub);
  } catch {
    return null;
  }
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

// GET /api/courses/popular - top clicked courses
router.get("/popular", async (req, res) => {
  try {
    const limit = Math.min(20, Number(req.query.limit) || 6);
    const popularCourses = await Course.find()
      .sort({ clicks_count: -1, updatedAt: -1 })
      .limit(limit);
    res.json(popularCourses);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch popular courses" });
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

// POST /api/courses/:id/click - Store course click in MongoDB
router.post("/:id/click", async (req, res) => {
  try {
    const course = await Course.findOne(getCourseQuery(req.params.id));
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // 1. Increment Course click count
    course.clicks_count = (course.clicks_count || 0) + 1;
    await course.save();

    // 2. Extract user if logged in
    const user = await getOptionalUser(req);

    // 3. Record click in CourseClick collection
    const clickDoc = await CourseClick.create({
      course_id: course._id,
      course_external_id: course.external_id,
      course_title: course.title,
      platform: course.platform,
      url: course.url,
      user_id: user ? user._id : null,
      user_email: user ? user.email : null,
      ip_address: req.ip || req.headers["x-forwarded-for"] || null,
      user_agent: req.headers["user-agent"] || null,
      clicked_at: new Date(),
    });

    // 4. If logged in, save to User's clicked courses list
    if (user) {
      user.clicked_courses = user.clicked_courses || [];
      // Remove prior entry if exists so latest click is at the top
      user.clicked_courses = user.clicked_courses.filter(
        (item) => item.course_id.toString() !== course._id.toString()
      );
      user.clicked_courses.unshift({
        course_id: course._id,
        course_title: course.title,
        platform: course.platform,
        url: course.url,
        clicked_at: new Date(),
      });
      // Keep recent 30 clicked courses
      if (user.clicked_courses.length > 30) {
        user.clicked_courses = user.clicked_courses.slice(0, 30);
      }
      await user.save();
    }

    res.json({
      success: true,
      message: "Course click saved in database",
      clicks_count: course.clicks_count,
      click_id: clickDoc._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to record course click" });
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
