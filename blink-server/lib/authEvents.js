const { AuthEvent } = require("../db");

// Audit logging must not make authentication unavailable. Any database error
// will already surface in the primary signup/login operation.
function recordAuthEvent({ user = null, email, eventType }) {
  return AuthEvent.create({
    user_id: user?._id || null,
    name: user?.name || null,
    email,
    event_type: eventType,
  }).catch((err) => console.error("Unable to record auth event:", err.message));
}

module.exports = { recordAuthEvent };
