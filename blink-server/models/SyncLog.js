const mongoose = require("mongoose");

const syncLogSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["success", "error"],
    },
    message: {
      type: String,
      default: null,
    },
    items_synced: {
      type: Number,
      default: 0,
    },
    synced_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.synced_at = ret.synced_at ? ret.synced_at.toISOString() : undefined;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.synced_at = ret.synced_at ? ret.synced_at.toISOString() : undefined;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const SyncLog = mongoose.models.SyncLog || mongoose.model("SyncLog", syncLogSchema);

module.exports = SyncLog;
