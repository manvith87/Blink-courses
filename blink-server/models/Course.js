const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    external_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    platform: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    level: {
      type: String,
      trim: true,
      default: null,
    },
    duration: {
      type: String,
      trim: true,
      default: null,
    },
    access: {
      type: String,
      trim: true,
      default: null,
    },
    blurb: {
      type: String,
      trim: true,
      default: null,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      required: true,
      default: "curated",
      enum: ["curated", "manual", "coursera", "edx", "udemy"],
      index: true,
    },
    clicks_count: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.created_at = ret.createdAt ? ret.createdAt.toISOString() : undefined;
        ret.updated_at = ret.updatedAt ? ret.updatedAt.toISOString() : undefined;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.created_at = ret.createdAt ? ret.createdAt.toISOString() : undefined;
        ret.updated_at = ret.updatedAt ? ret.updatedAt.toISOString() : undefined;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound text index for search across title, blurb, category, platform
courseSchema.index({
  title: "text",
  blurb: "text",
  category: "text",
  platform: "text",
});

const Course = mongoose.models.Course || mongoose.model("Course", courseSchema);

module.exports = Course;
