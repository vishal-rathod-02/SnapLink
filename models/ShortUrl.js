const mongoose = require("mongoose");

const shortUrlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: true,
      trim: true,
    },
    shortCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastVisitedAt: {
      type: Date,
      default: null,
    },
    createdIp: {
      type: String,
      default: "unknown",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

shortUrlSchema.index({ originalUrl: 1 });

module.exports = mongoose.model("ShortUrl", shortUrlSchema);

