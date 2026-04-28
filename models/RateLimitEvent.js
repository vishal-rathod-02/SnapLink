const mongoose = require("mongoose");

const rateLimitEventSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 24 * 60 * 60,
    },
  },
  {
    versionKey: false,
  },
);

rateLimitEventSchema.index({ scope: 1, key: 1, createdAt: -1 });

module.exports = mongoose.model("RateLimitEvent", rateLimitEventSchema);
