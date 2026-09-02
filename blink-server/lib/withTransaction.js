// Provides a safe batch execution helper for MongoDB / Mongoose operations.
// Automatically uses a MongoDB session transaction if replica set transactions are supported,
// or runs directly otherwise.

const mongoose = require("mongoose");

function withTransaction(fn) {
  return async function (...args) {
    let session = null;
    try {
      // Check if transactions are supported by attempting to start a session
      session = await mongoose.startSession();
      session.startTransaction();
      const result = await fn(...args, session);
      await session.commitTransaction();
      return result;
    } catch (err) {
      if (session && session.inTransaction()) {
        try {
          await session.abortTransaction();
        } catch {
          // ignore abort error
        }
      }
      // If error is due to standalone instance not supporting transactions, execute without session
      if (
        err.message &&
        (err.message.includes("Transaction numbers are only allowed on a replica set") ||
          err.message.includes("This MongoDB deployment does not support retryable writes"))
      ) {
        return fn(...args, null);
      }
      throw err;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  };
}

module.exports = { withTransaction };
