const mongoose = require("mongoose");

const stepSchema = new mongoose.Schema(
  {
    step_order: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
  },
  {
    _id: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

const domainSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    steps: [stepSchema],
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

const Domain = mongoose.models.Domain || mongoose.model("Domain", domainSchema);

module.exports = Domain;
