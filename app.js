const path = require("path");
const express = require("express");

const { errorHandler } = require("./middlewares/errorHandler");
const { notFoundHandler } = require("./middlewares/notFoundHandler");
const webRoutes = require("./routes/webRoutes");
const {
  formatDate,
  formatNumber,
  formatRelativeTime,
} = require("./utils/formatters");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("trust proxy", true);

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.locals.appName = "SnapLink";
app.locals.formatDate = formatDate;
app.locals.formatRelativeTime = formatRelativeTime;
app.locals.formatNumber = formatNumber;

app.use("/", webRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

