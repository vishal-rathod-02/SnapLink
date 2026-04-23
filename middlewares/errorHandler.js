const crypto = require("crypto");

function errorHandler(error, req, res, next) {
  console.error("Unhandled server error:", error);

  const errorId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : crypto.randomBytes(12).toString("hex");

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).render("error", {
    pageTitle: "Server Error",
    activePage: "",
    errorId,
  });
}

module.exports = {
  errorHandler,
};

