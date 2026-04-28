const crypto = require("crypto");
const mongoose = require("mongoose");

const ShortUrl = require("../models/ShortUrl");
const { getClientIp } = require("../utils/request");

const SHORT_CODE_CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;
const CUSTOM_ALIAS_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,30}[a-z0-9])$/;
const RESERVED_SHORT_CODES = new Set(
  [
    "login",
    "signup",
    "logout",
    "shorten",
    "dashboard",
    "urls",
    "blocked",
    "assets",
    "css",
    "js",
    "favicon.ico",
    "robots.txt",
    "sitemap.xml",
  ].map((value) => value.toLowerCase()),
);

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

function normalizeCustomAlias(input) {
  return String(input || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function validateCustomAlias(input) {
  const normalizedAlias = normalizeCustomAlias(input);
  if (!normalizedAlias) {
    return {
      isValid: true,
      normalizedAlias: "",
    };
  }

  if (RESERVED_SHORT_CODES.has(normalizedAlias)) {
    return {
      isValid: false,
      message: `The alias "/${normalizedAlias}" is reserved by the app. Please choose another one.`,
      normalizedAlias,
    };
  }

  if (!CUSTOM_ALIAS_PATTERN.test(normalizedAlias)) {
    return {
      isValid: false,
      message:
        "Custom aliases must be 3 to 32 characters and use only letters, numbers, hyphens, or underscores.",
      normalizedAlias,
    };
  }

  return {
    isValid: true,
    normalizedAlias,
  };
}

function toObjectId(value) {
  if (!value) {
    return null;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  return new mongoose.Types.ObjectId(String(value));
}

function createUserFacingError(message) {
  const error = new Error(message);
  error.isUserFacing = true;
  error.statusCode = 400;
  return error;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findShortUrlByCodeInsensitive(shortCode) {
  return ShortUrl.findOne({
    shortCode: {
      $regex: `^${escapeRegExp(shortCode)}$`,
      $options: "i",
    },
  });
}

async function createShortUrlDocument({ originalUrl, ownerId, shortCode, isCustomAlias, req }) {
  return ShortUrl.create({
    originalUrl,
    owner: ownerId,
    shortCode,
    isCustomAlias,
    createdIp: getClientIp(req),
  });
}

async function findOrCreateShortUrl({ originalUrl, ownerId, req, customAlias = "" }) {
  if (!ownerId) {
    throw new Error("Authenticated ownership is required to create a short URL.");
  }

  if (customAlias) {
    const existingCustomAlias = await findShortUrlByCodeInsensitive(customAlias);
    if (existingCustomAlias) {
      if (
        String(existingCustomAlias.owner || "") === String(ownerId) &&
        existingCustomAlias.originalUrl === originalUrl
      ) {
        return { shortUrlDoc: existingCustomAlias, isNew: false };
      }

      throw createUserFacingError(
        `The alias "/${customAlias}" is already taken. Try another one.`,
      );
    }

    try {
      const createdCustom = await createShortUrlDocument({
        originalUrl,
        ownerId,
        shortCode: customAlias,
        isCustomAlias: true,
        req,
      });

      return { shortUrlDoc: createdCustom, isNew: true };
    } catch (error) {
      if (error?.code === 11000) {
        throw createUserFacingError(
          `The alias "/${customAlias}" is already taken. Try another one.`,
        );
      }

      throw error;
    }
  }

  const existingDefault = await ShortUrl.findOne({
    owner: ownerId,
    originalUrl,
    isCustomAlias: false,
  });
  if (existingDefault) {
    return { shortUrlDoc: existingDefault, isNew: false };
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidateCode = generateShortCode();
    try {
      const created = await createShortUrlDocument({
        originalUrl,
        shortCode: candidateCode,
        ownerId,
        isCustomAlias: false,
        req,
      });

      return { shortUrlDoc: created, isNew: true };
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }

      const concurrentDefault = await ShortUrl.findOne({
        owner: ownerId,
        originalUrl,
        isCustomAlias: false,
      });
      if (concurrentDefault) {
        return { shortUrlDoc: concurrentDefault, isNew: false };
      }
    }
  }

  throw new Error("Could not generate a unique short code. Please retry.");
}

async function getHomeSnapshot(ownerId = null) {
  const ownerObjectId = toObjectId(ownerId);
  const ownerFilter = ownerObjectId ? { owner: ownerObjectId } : {};
  const aggregatePipeline = [
    ...(ownerObjectId ? [{ $match: { owner: ownerObjectId } }] : []),
    { $group: { _id: null, clicks: { $sum: "$clicks" } } },
  ];

  const [recentUrls, totalUrls, totalClicksAgg] = await Promise.all([
    ownerObjectId ? ShortUrl.find(ownerFilter).sort({ createdAt: -1 }).limit(8).lean() : [],
    ShortUrl.countDocuments(ownerFilter),
    ShortUrl.aggregate(aggregatePipeline),
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
  const exactMatch = await ShortUrl.findOne({ shortCode });
  if (exactMatch) {
    return exactMatch;
  }

  const normalizedAlias = normalizeCustomAlias(shortCode);
  if (!normalizedAlias || normalizedAlias === shortCode) {
    return null;
  }

  return ShortUrl.findOne({
    shortCode: normalizedAlias,
    isCustomAlias: true,
  });
}

async function registerUrlVisit(shortUrlDoc) {
  shortUrlDoc.clicks += 1;
  shortUrlDoc.lastVisitedAt = new Date();
  await shortUrlDoc.save();
}

function isValidDocumentId(documentId) {
  return /^[a-fA-F0-9]{24}$/.test(String(documentId || ""));
}

async function deleteShortUrlById(urlId, ownerId = null) {
  if (!isValidDocumentId(urlId)) {
    return null;
  }

  const query = ownerId ? { _id: urlId, owner: ownerId } : { _id: urlId };
  return ShortUrl.findOneAndDelete(query);
}

async function getOwnedShortUrlById(urlId, ownerId) {
  if (!ownerId || !isValidDocumentId(urlId)) {
    return null;
  }

  return ShortUrl.findOne({
    _id: urlId,
    owner: ownerId,
  });
}

module.exports = {
  deleteShortUrlById,
  findOrCreateShortUrl,
  getHomeSnapshot,
  getOwnedShortUrlById,
  getShortUrlByCode,
  isValidShortCode,
  normalizeCustomAlias,
  registerUrlVisit,
  validateCustomAlias,
};
