const express = require("express");

const {
  login,
  logout,
  renderLogin,
  renderSignup,
  signup,
} = require("../controllers/authController");
const { renderDashboard } = require("../controllers/dashboardController");
const {
  deleteShortUrl,
  redirectShortUrl,
  renderHome,
  renderShortUrlQrCode,
  shortenUrl,
} = require("../controllers/urlController");
const { requireAuth, requireGuest } = require("../middlewares/auth");
const { createRateLimitMiddleware } = require("../middlewares/rateLimit");
const { asyncHandler } = require("../middlewares/asyncHandler");
const { getClientIp } = require("../utils/request");

const router = express.Router();
const loginRateLimit = createRateLimitMiddleware({
  scope: "auth-login",
  windowMs: 15 * 60 * 1000,
  maxRequests: 8,
  keyGenerator: (req) => {
    const email = String(req.body?.email || "").trim().toLowerCase() || "unknown";
    return `${getClientIp(req)}:${email}`;
  },
  headline: "Too many login attempts",
  description: "Please wait a few minutes before trying to sign in again.",
});
const signupRateLimit = createRateLimitMiddleware({
  scope: "auth-signup",
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  keyGenerator: (req) => getClientIp(req),
  headline: "Too many signup attempts",
  description: "Account creation is temporarily limited from this network. Please try again later.",
});
const shortenRateLimit = createRateLimitMiddleware({
  scope: "shorten-create",
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  keyGenerator: (req) => String(req.currentUser?._id || getClientIp(req)),
  headline: "Shortening limit reached",
  description: "You have created a lot of links in a short time. Please wait a moment and try again.",
});

router.get("/", asyncHandler(renderHome));
router.get("/login", requireGuest, renderLogin);
router.post("/login", requireGuest, loginRateLimit, asyncHandler(login));
router.get("/signup", requireGuest, renderSignup);
router.post("/signup", requireGuest, signupRateLimit, asyncHandler(signup));
router.post("/logout", requireAuth, asyncHandler(logout));
router.post("/shorten", requireAuth, shortenRateLimit, asyncHandler(shortenUrl));
router.post("/urls/:urlId/delete", requireAuth, asyncHandler(deleteShortUrl));
router.get("/urls/:urlId/qr", requireAuth, asyncHandler(renderShortUrlQrCode));
router.get("/dashboard", requireAuth, asyncHandler(renderDashboard));
router.get("/:shortCode", asyncHandler(redirectShortUrl));

module.exports = router;
