const crypto = require("crypto");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;

const SESSION_COOKIE_NAME = "snaplink.sid";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSessionSecret() {
  const configuredSecret = String(process.env.SESSION_SECRET || "").trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }

  return `snaplink-dev-session-secret-${crypto.createHash("sha256").update(__dirname).digest("hex")}`;
}

function createSessionMiddleware() {
  const mongoUrl = String(process.env.MONGODB_URI || "").trim();
  if (!mongoUrl) {
    throw new Error("MONGODB_URI is required to initialize session storage.");
  }

  return session({
    name: SESSION_COOKIE_NAME,
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: MongoStore.create({
      mongoUrl,
      collectionName: "sessions",
      ttl: Math.floor(SESSION_TTL_MS / 1000),
      autoRemove: "native",
      touchAfter: 24 * 60 * 60,
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_TTL_MS,
    },
  });
}

module.exports = {
  SESSION_COOKIE_NAME,
  createSessionMiddleware,
};
