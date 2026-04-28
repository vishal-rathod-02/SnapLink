const mongoose = require("mongoose");
const ActivityLog = require("../models/ActivityLog");
const RateLimitEvent = require("../models/RateLimitEvent");
const ShortUrl = require("../models/ShortUrl");
const User = require("../models/User");

const MONGODB_URI =
  process.env.MONGODB_URI;

async function dropLegacyShortUrlIndex() {
  try {
    await ShortUrl.collection.dropIndex("owner_1_originalUrl_1");
  } catch (error) {
    if (
      error?.codeName === "IndexNotFound" ||
      error?.code === 27 ||
      error?.code === 26 ||
      /index not found/i.test(error?.message || "") ||
      /ns not found/i.test(error?.message || "")
    ) {
      return;
    }

    throw error;
  }
}

async function syncDatabaseIndexes() {
  await dropLegacyShortUrlIndex();
  await Promise.all([
    ShortUrl.syncIndexes(),
    ActivityLog.syncIndexes(),
    User.syncIndexes(),
    RateLimitEvent.syncIndexes(),
  ]);
}

async function connectDatabase() {
  await mongoose.connect(MONGODB_URI);
  await syncDatabaseIndexes();
}

module.exports = {
  connectDatabase,
};
