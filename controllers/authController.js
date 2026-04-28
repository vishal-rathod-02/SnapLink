const { SESSION_COOKIE_NAME } = require("../config/session");
const {
  authenticateUser,
  buildLoginInput,
  buildSignupInput,
  registerUser,
} = require("../services/authService");
const { pushFlashMessage } = require("../utils/flash");

function buildAuthViewModel({ pageTitle, activePage, heading, subheading, errorMessage = null, formValues }) {
  return {
    pageTitle,
    activePage,
    heading,
    subheading,
    errorMessage,
    formValues,
  };
}

function getStoredReturnTo(req) {
  const candidate = String(req.session?.returnTo || "").trim();
  if (candidate.startsWith("/") && !candidate.startsWith("//")) {
    return candidate;
  }

  return "/";
}

function normalizePostAuthRedirect(target) {
  return target === "/login" || target === "/signup" ? "/" : target;
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function establishAuthenticatedSession(req, userId) {
  await regenerateSession(req);
  req.session.userId = String(userId);
  await saveSession(req);
}

function renderLogin(req, res) {
  res.render(
    "login",
    buildAuthViewModel({
      pageTitle: "Login",
      activePage: "login",
      heading: "Welcome back",
      subheading: "Sign in to create, manage, and analyze your short links.",
      formValues: buildLoginInput(),
    }),
  );
}

function renderSignup(req, res) {
  res.render(
    "signup",
    buildAuthViewModel({
      pageTitle: "Create your account",
      activePage: "signup",
      heading: "Launch your link workspace",
      subheading: "Create an account to save links, track clicks, and manage everything in one place.",
      formValues: buildSignupInput(),
    }),
  );
}

async function signup(req, res) {
  const returnTo = normalizePostAuthRedirect(getStoredReturnTo(req));
  const result = await registerUser(req.body);
  if (!result.isValid) {
    return res.status(400).render(
      "signup",
      buildAuthViewModel({
        pageTitle: "Create your account",
        activePage: "signup",
        heading: "Launch your link workspace",
        subheading: "Create an account to save links, track clicks, and manage everything in one place.",
        errorMessage: result.message,
        formValues: {
          ...buildSignupInput(),
          ...result.values,
        },
      }),
    );
  }

  await establishAuthenticatedSession(req, result.user._id);
  pushFlashMessage(req, {
    type: "success",
    text: "Your account is ready. You can start shortening links now.",
  });
  return res.redirect(303, returnTo === "/login" || returnTo === "/signup" ? "/" : returnTo);
}

async function login(req, res) {
  const returnTo = normalizePostAuthRedirect(getStoredReturnTo(req));
  const result = await authenticateUser(req.body);
  if (!result.isValid) {
    return res.status(400).render(
      "login",
      buildAuthViewModel({
        pageTitle: "Login",
        activePage: "login",
        heading: "Welcome back",
        subheading: "Sign in to create, manage, and analyze your short links.",
        errorMessage: result.message,
        formValues: {
          ...buildLoginInput(),
          ...result.values,
        },
      }),
    );
  }

  await establishAuthenticatedSession(req, result.user._id);
  pushFlashMessage(req, {
    type: "success",
    text: "You are signed in and ready to manage your links.",
  });
  return res.redirect(303, returnTo === "/login" || returnTo === "/signup" ? "/" : returnTo);
}

async function logout(req, res) {
  await destroySession(req);
  res.clearCookie(SESSION_COOKIE_NAME);
  return res.redirect(303, "/");
}

module.exports = {
  login,
  logout,
  renderLogin,
  renderSignup,
  signup,
};
