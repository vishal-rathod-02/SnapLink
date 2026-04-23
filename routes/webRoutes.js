const express = require("express");

const { renderDashboard } = require("../controllers/dashboardController");
const {
  deleteShortUrl,
  redirectShortUrl,
  renderHome,
  shortenUrl,
} = require("../controllers/urlController");
const { asyncHandler } = require("../middlewares/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(renderHome));
router.post("/shorten", asyncHandler(shortenUrl));
router.post("/urls/:urlId/delete", asyncHandler(deleteShortUrl));
router.get("/dashboard", asyncHandler(renderDashboard));
router.get("/:shortCode", asyncHandler(redirectShortUrl));

module.exports = router;
