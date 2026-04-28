const User = require("../models/User");
const { pushFlashMessage, consumeFlashMessages } = require("../utils/flash");

function isSafeLocalPath(candidate) {
  const value = String(candidate || "").trim();
  return value.startsWith("/") && !value.startsWith("//");
}

function resolveReturnTo(req) {
  const storedReturnTo = String(req.session?.returnTo || "").trim();
  if (req.session) {
    delete req.session.returnTo;
  }

  return isSafeLocalPath(storedReturnTo) ? storedReturnTo : "/";
}

function rememberReturnTo(req) {
  if (!req.session || req.method !== "GET") {
    return;
  }

  if (isSafeLocalPath(req.originalUrl)) {
    req.session.returnTo = req.originalUrl;
  }
}

async function attachAuthContext(req, res, next) {
  try {
    res.locals.flashMessages = consumeFlashMessages(req);
    res.locals.currentUser = null;
    res.locals.isAuthenticated = false;
    req.currentUser = null;

    const userId = String(req.session?.userId || "").trim();
    if (!userId) {
      return next();
    }

    const currentUser = await User.findById(userId).select("name email createdAt").lean();
    if (!currentUser) {
      if (req.session) {
        delete req.session.userId;
      }
      return next();
    }

    req.currentUser = currentUser;
    res.locals.currentUser = currentUser;
    res.locals.isAuthenticated = true;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAuth(req, res, next) {
  if (req.currentUser) {
    return next();
  }

  rememberReturnTo(req);
  pushFlashMessage(req, {
    type: "warning",
    text: "Please sign in to create and manage your short links.",
  });
  return res.redirect(303, "/login");
}

function requireGuest(req, res, next) {
  if (!req.currentUser) {
    return next();
  }

  return res.redirect(303, resolveReturnTo(req));
}

module.exports = {
  attachAuthContext,
  requireAuth,
  requireGuest,
  resolveReturnTo,
};
