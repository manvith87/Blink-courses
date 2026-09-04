const mongoose = require("mongoose");

const courseClickSchema = new mongoose.Schema(
  {
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    course_external_id: {
      type: String,
      default: null,
      index: true,
    },
    course_title: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    user_email: {
      type: String,
      default: null,
    },
    clicked_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    ip_address: {
      type: String,
      default: null,
    },
    user_agent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.clicked_at = ret.clicked_at ? ret.clicked_at.toISOString() : undefined;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const CourseClick = mongoose.models.CourseClick || mongoose.model("CourseClick", courseClickSchema);

module.exports = CourseClick;
