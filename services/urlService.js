const crypto = require("crypto");
const ShortUrl = require("../models/ShortUrl");
const { getClientIp } = require("../utils/request");

const SHORT_CODE_CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]{4,20}$/;

function generateShortCode(length = 7) {
  let code = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i += 1) {
    code += SHORT_CODE_CHARSET[bytes[i] % SHORT_CODE_CHARSET.length];
  }

  return code;
}

function isValidShortCode(shortCode) {
  return SHORT_CODE_PATTERN.test(shortCode);
}

async function findOrCreateShortUrl(originalUrl, req) {
  const existing = await ShortUrl.findOne({ originalUrl });
  if (existing) {
    return { shortUrlDoc: existing, isNew: false };
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidateCode = generateShortCode();
    try {
      const created = await ShortUrl.create({
        originalUrl,
        shortCode: candidateCode,
        createdIp: getClientIp(req),
      });

      return { shortUrlDoc: created, isNew: true };
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }
    }
  }

  throw new Error("Could not generate a unique short code. Please retry.");
}

async function getHomeSnapshot() {
  const [recentUrls, totalUrls, totalClicksAgg] = await Promise.all([
    ShortUrl.find().sort({ createdAt: -1 }).limit(8).lean(),
    ShortUrl.countDocuments(),
    ShortUrl.aggregate([{ $group: { _id: null, clicks: { $sum: "$clicks" } } }]),
  ]);

  return {
    recentUrls,
    stats: {
      totalUrls,
      totalClicks: totalClicksAgg[0]?.clicks || 0,
    },
  };
}

async function getShortUrlByCode(shortCode) {
  return ShortUrl.findOne({ shortCode });
}

async function registerUrlVisit(shortUrlDoc) {
  shortUrlDoc.clicks += 1;
  shortUrlDoc.lastVisitedAt = new Date();
  await shortUrlDoc.save();
}

function isValidDocumentId(documentId) {
  return /^[a-fA-F0-9]{24}$/.test(String(documentId || ""));
}

async function deleteShortUrlById(urlId) {
  if (!isValidDocumentId(urlId)) {
    return null;
  }

  return ShortUrl.findByIdAndDelete(urlId);
}

module.exports = {
  deleteShortUrlById,
  findOrCreateShortUrl,
  getHomeSnapshot,
  getShortUrlByCode,
  isValidShortCode,
  registerUrlVisit,
};
