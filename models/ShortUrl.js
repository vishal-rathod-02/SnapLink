const mongoose = require("mongoose");

const shortUrlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    shortCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    isCustomAlias: {
      type: Boolean,
      default: false,
      index: true,
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
shortUrlSchema.index({ owner: 1, originalUrl: 1, createdAt: -1 });
shortUrlSchema.index(
  { owner: 1, originalUrl: 1, isCustomAlias: 1 },
  {
    unique: true,
    partialFilterExpression: {
      owner: { $exists: true },
      isCustomAlias: false,
    },
  },
);

module.exports = mongoose.model("ShortUrl", shortUrlSchema);
