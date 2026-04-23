const { createActivityLog } = require("../services/activityService");
const {
  deleteShortUrlById,
  findOrCreateShortUrl,
  getHomeSnapshot,
  getShortUrlByCode,
  isValidShortCode,
  registerUrlVisit,
} = require("../services/urlService");
const { getBaseUrl } = require("../utils/request");
const { normalizeAndValidateUrl } = require("../utils/url");

function buildHomeViewModel({
  req,
  snapshot,
  errorMessage = null,
  shortResult = null,
  previousInput = "",
}) {
  return {
    pageTitle: "SnapLink - Snap it. Share it.",
    activePage: "home",
    baseUrl: getBaseUrl(req),
    errorMessage,
    shortResult,
    previousInput,
    ...snapshot,
  };
}

function resolveSafeRedirectTarget(candidate) {
  const target = String(candidate || "").trim();
  return target === "/dashboard" ? "/dashboard" : "/";
}

async function renderHome(req, res) {
  const snapshot = await getHomeSnapshot();
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
  const validation = normalizeAndValidateUrl(previousInput);

  if (!validation.isValid) {
    const snapshot = await getHomeSnapshot();
    return res.status(400).render(
      "home",
      buildHomeViewModel({
        req,
        snapshot,
        errorMessage: validation.message,
        shortResult: null,
        previousInput,
      }),
    );
  }

  const { shortUrlDoc, isNew } = await findOrCreateShortUrl(
    validation.normalizedUrl,
    req,
  );

  await createActivityLog({
    type: "SHORTENED",
    shortCode: shortUrlDoc.shortCode,
    originalUrl: shortUrlDoc.originalUrl,
    req,
    meta: {
      reusedExisting: !isNew,
    },
  });

  const snapshot = await getHomeSnapshot();

  return res.status(isNew ? 201 : 200).render(
    "home",
    buildHomeViewModel({
      req,
      snapshot,
      previousInput: "",
      shortResult: {
        shortCode: shortUrlDoc.shortCode,
        originalUrl: shortUrlDoc.originalUrl,
        shortUrl: `${getBaseUrl(req)}/${shortUrlDoc.shortCode}`,
        isReused: !isNew,
      },
    }),
  );
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

  await deleteShortUrlById(urlId);
  return res.redirect(303, redirectTo);
}

module.exports = {
  deleteShortUrl,
  redirectShortUrl,
  renderHome,
  shortenUrl,
};
