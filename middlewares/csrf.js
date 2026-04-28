const crypto = require("crypto");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function getOrCreateCsrfToken(req) {
  if (!req.session) {
    return "";
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }

  return req.session.csrfToken;
}

function tokensMatch(expected, received) {
  const expectedBuffer = Buffer.from(String(expected || ""), "utf8");
  const receivedBuffer = Buffer.from(String(received || ""), "utf8");

  if (!expectedBuffer.length || expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function renderBlockedRequest(res, req, options = {}) {
  const {
    statusCode = 403,
    pageTitle = statusCode === 429 ? "Too Many Requests" : "Request Blocked",
    headline = statusCode === 429 ? "Too many requests for now" : "Security check failed",
    description =
      statusCode === 429
        ? "Please wait a moment before trying again."
        : "Your security token was missing or expired. Please go back and retry the form.",
    primaryHref = req.currentUser ? "/" : "/login",
    primaryLabel = req.currentUser ? "Back to Workspace" : "Go to Login",
    secondaryHref = "/",
    secondaryLabel = "Home",
  } = options;

  return res.status(statusCode).render("blocked", {
    pageTitle,
    activePage: "",
    statusCode,
    headline,
    description,
    primaryHref,
    primaryLabel,
    secondaryHref,
    secondaryLabel,
  });
}

function attachCsrfToken(req, res, next) {
  try {
    res.locals.csrfToken = getOrCreateCsrfToken(req);
    return next();
  } catch (error) {
    return next(error);
  }
}

function verifyCsrfToken(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const expectedToken = getOrCreateCsrfToken(req);
  const receivedToken =
    req.body?._csrf || req.get("x-csrf-token") || req.get("x-xsrf-token") || "";

  if (tokensMatch(expectedToken, receivedToken)) {
    return next();
  }

  return renderBlockedRequest(res, req);
}

module.exports = {
  attachCsrfToken,
  renderBlockedRequest,
  verifyCsrfToken,
};
