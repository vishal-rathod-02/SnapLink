const { createActivityLog } = require("../services/activityService");
const {
  deleteShortUrlById,
  findOrCreateShortUrl,
  getHomeSnapshot,
  getOwnedShortUrlById,
  getShortUrlByCode,
  isValidShortCode,
  registerUrlVisit,
  validateCustomAlias,
} = require("../services/urlService");
const {
  buildQrFilename,
  generateQrPngBuffer,
  generateQrSvg,
  normalizeQrFormat,
  normalizeQrSize,
} = require("../services/qrService");
const { getBaseUrl } = require("../utils/request");
const { normalizeAndValidateUrl } = require("../utils/url");

function buildHomeViewModel({
  req,
  snapshot,
  errorMessage = null,
  shortResult = null,
  previousInput = "",
  previousAlias = "",
}) {
  return {
    pageTitle: "SnapLink - Snap it. Share it.",
    activePage: "home",
    baseUrl: getBaseUrl(req),
    errorMessage,
    shortResult,
    previousInput,
    previousAlias,
    ...snapshot,
  };
}

function resolveSafeRedirectTarget(candidate) {
  const target = String(candidate || "").trim();
  if (target === "/") {
    return "/";
  }

  if (target === "/dashboard" || target.startsWith("/dashboard?")) {
    return target;
  }

  return "/";
}

function buildQrAssetUrls(urlId) {
  const qrBasePath = `/urls/${urlId}/qr`;

  return {
    qrPreviewUrl: `${qrBasePath}?format=svg&size=220`,
    qrPngDownloadUrl: `${qrBasePath}?format=png&size=320&download=1`,
    qrSvgDownloadUrl: `${qrBasePath}?format=svg&size=320&download=1`,
  };
}

function buildShortResult(req, shortUrlDoc, isNew) {
  return {
    id: String(shortUrlDoc._id),
    shortCode: shortUrlDoc.shortCode,
    originalUrl: shortUrlDoc.originalUrl,
    shortUrl: `${getBaseUrl(req)}/${shortUrlDoc.shortCode}`,
    isReused: !isNew,
    isCustomAlias: shortUrlDoc.isCustomAlias,
    ...buildQrAssetUrls(shortUrlDoc._id),
  };
}

async function renderHome(req, res) {
  const snapshot = await getHomeSnapshot(req.currentUser?._id);
  res.render(
    "home",
    buildHomeViewModel({
      req,
      snapshot,
    }),
  );
}

async function shortenUrl(req, res) {
  const previousInput = (req.body.originalUrl || "").trim();
  const previousAlias = (req.body.customAlias || "").trim();
  const validation = normalizeAndValidateUrl(previousInput);
  const aliasValidation = validateCustomAlias(previousAlias);

  if (!validation.isValid) {
    const snapshot = await getHomeSnapshot(req.currentUser?._id);
    return res.status(400).render(
      "home",
      buildHomeViewModel({
        req,
        snapshot,
        errorMessage: validation.message,
        shortResult: null,
        previousInput,
        previousAlias,
      }),
    );
  }

  if (!aliasValidation.isValid) {
    const snapshot = await getHomeSnapshot(req.currentUser?._id);
    return res.status(400).render(
      "home",
      buildHomeViewModel({
        req,
        snapshot,
        errorMessage: aliasValidation.message,
        shortResult: null,
        previousInput,
        previousAlias,
      }),
    );
  }

  let shortUrlResult;
  try {
    shortUrlResult = await findOrCreateShortUrl({
      originalUrl: validation.normalizedUrl,
      ownerId: req.currentUser?._id,
      req,
      customAlias: aliasValidation.normalizedAlias,
    });
  } catch (error) {
    if (error?.isUserFacing) {
      const snapshot = await getHomeSnapshot(req.currentUser?._id);
      return res.status(error.statusCode || 400).render(
        "home",
        buildHomeViewModel({
          req,
          snapshot,
          errorMessage: error.message,
          shortResult: null,
          previousInput,
          previousAlias,
        }),
      );
    }

    throw error;
  }

  const { shortUrlDoc, isNew } = shortUrlResult;

  await createActivityLog({
    type: "SHORTENED",
    ownerId: req.currentUser?._id,
    shortUrlId: shortUrlDoc._id,
    shortCode: shortUrlDoc.shortCode,
    originalUrl: shortUrlDoc.originalUrl,
    req,
    meta: {
      reusedExisting: !isNew,
      isCustomAlias: shortUrlDoc.isCustomAlias,
    },
  });

  const snapshot = await getHomeSnapshot(req.currentUser?._id);

  return res.status(isNew ? 201 : 200).render(
    "home",
    buildHomeViewModel({
      req,
      snapshot,
      previousInput: "",
      previousAlias: "",
      shortResult: buildShortResult(req, shortUrlDoc, isNew),
    }),
  );
}

async function renderShortUrlQrCode(req, res) {
  const shortUrlDoc = await getOwnedShortUrlById(req.params.urlId, req.currentUser?._id);
  if (!shortUrlDoc) {
    return res.status(404).render("not-found", {
      pageTitle: "QR Code Not Found",
      activePage: "",
      missingCode: null,
    });
  }

  const format = normalizeQrFormat(req.query.format);
  const size = normalizeQrSize(req.query.size);
  const shouldDownload = String(req.query.download || "").trim() === "1";
  const shortUrl = `${getBaseUrl(req)}/${shortUrlDoc.shortCode}`;
  const fileName = buildQrFilename(shortUrlDoc.shortCode, format);

  res.set("Cache-Control", "private, max-age=300");

  if (shouldDownload) {
    res.attachment(fileName);
  } else {
    res.set("Content-Disposition", "inline");
  }

  if (format === "png") {
    const pngBuffer = await generateQrPngBuffer(shortUrl, size);
    res.type("png");
    return res.send(pngBuffer);
  }

  const svgMarkup = await generateQrSvg(shortUrl, size);
  res.set("Content-Type", "image/svg+xml; charset=utf-8");
  return res.send(svgMarkup);
}

async function redirectShortUrl(req, res, next) {
  const shortCode = (req.params.shortCode || "").trim();

  if (!isValidShortCode(shortCode)) {
    return next();
  }

  const shortUrlDoc = await getShortUrlByCode(shortCode);
  if (!shortUrlDoc) {
    return res.status(404).render("not-found", {
      pageTitle: "Short URL Not Found",
      activePage: "",
      missingCode: shortCode,
    });
  }

  await registerUrlVisit(shortUrlDoc);
  await createActivityLog({
    type: "VISITED",
    ownerId: shortUrlDoc.owner,
    shortUrlId: shortUrlDoc._id,
    shortCode: shortUrlDoc.shortCode,
    originalUrl: shortUrlDoc.originalUrl,
    req,
  });

  return res.redirect(shortUrlDoc.originalUrl);
}

async function deleteShortUrl(req, res) {
  const urlId = String(req.params.urlId || "").trim();
  const redirectTo = resolveSafeRedirectTarget(req.body.redirectTo);

  if (!urlId) {
    return res.redirect(303, redirectTo);
  }

  await deleteShortUrlById(urlId, req.currentUser?._id);
  return res.redirect(303, redirectTo);
}

module.exports = {
  deleteShortUrl,
  redirectShortUrl,
  renderHome,
  renderShortUrlQrCode,
  shortenUrl,
};
