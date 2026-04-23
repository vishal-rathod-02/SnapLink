const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["SHORTENED", "VISITED"],
      index: true,
    },
    shortCode: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    originalUrl: {
      type: String,
      default: null,
      trim: true,
    },
    ipAddress: {
      type: String,
      default: "unknown",
      trim: true,
    },
    userAgent: {
      type: String,
      default: "unknown",
      trim: true,
    },
    referrer: {
      type: String,
      default: "direct",
      trim: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);

