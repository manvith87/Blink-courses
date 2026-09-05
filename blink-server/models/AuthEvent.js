const mongoose = require("mongoose");

// Records authentication activity without storing secrets. This is an audit
// collection, not a session store: passwords and JWTs must never be written.
const authEventSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    name: { type: String, default: null, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    event_type: {
      type: String,
      required: true,
      enum: ["signup", "login_success", "login_failure"],
      index: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

authEventSchema.index({ created_at: -1 });

const AuthEvent = mongoose.models.AuthEvent || mongoose.model("AuthEvent", authEventSchema);

module.exports = AuthEvent;
