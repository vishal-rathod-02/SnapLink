const ActivityLog = require("../models/ActivityLog");
const { getClientIp } = require("../utils/request");

async function createActivityLog({
  type,
  ownerId = null,
  shortUrlId = null,
  shortCode = null,
  originalUrl = null,
  req,
  meta = {},
}) {
  try {
    await ActivityLog.create({
      type,
      owner: ownerId,
      shortUrlId,
      shortCode,
      originalUrl,
      ipAddress: getClientIp(req),
      userAgent: req.get("user-agent") || "unknown",
      referrer: req.get("referer") || "direct",
      meta,
    });
  } catch (error) {
    console.error("Failed to save activity log:", error.message);
  }
}

module.exports = {
  createActivityLog,
};
