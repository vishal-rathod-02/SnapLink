const RateLimitEvent = require("../models/RateLimitEvent");
const { getClientIp } = require("../utils/request");
const { renderBlockedRequest } = require("./csrf");

function createRateLimitMiddleware({
  scope,
  windowMs,
  maxRequests,
  keyGenerator,
  headline,
  description,
}) {
  if (!scope) {
    throw new Error("Rate limit scope is required.");
  }

  return async function rateLimitMiddleware(req, res, next) {
    try {
      const resolvedKey = keyGenerator ? keyGenerator(req) : getClientIp(req);
      const key = String(resolvedKey || "anonymous").trim().slice(0, 160) || "anonymous";
      const windowStart = new Date(Date.now() - windowMs);

      const requestCount = await RateLimitEvent.countDocuments({
        scope,
        key,
        createdAt: { $gte: windowStart },
      });

      if (requestCount >= maxRequests) {
        res.set("Retry-After", String(Math.ceil(windowMs / 1000)));
        return renderBlockedRequest(res, req, {
          statusCode: 429,
          pageTitle: "Too Many Requests",
          headline: headline || "Too many requests for now",
          description:
            description ||
            "This action has been temporarily limited to protect the app. Please try again shortly.",
          primaryHref: req.currentUser ? "/" : "/login",
          primaryLabel: req.currentUser ? "Back to Workspace" : "Back to Login",
        });
      }

      await RateLimitEvent.create({
        scope,
        key,
      });

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  createRateLimitMiddleware,
};
