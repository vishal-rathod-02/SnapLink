const { getDashboardSnapshot } = require("../services/dashboardService");
const { getBaseUrl } = require("../utils/request");

async function renderDashboard(req, res) {
  const snapshot = await getDashboardSnapshot();
  res.render("dashboard", {
    pageTitle: "SnapLink Dashboard - Activity Insights",
    activePage: "dashboard",
    baseUrl: getBaseUrl(req),
    ...snapshot,
  });
}

module.exports = {
  renderDashboard,
};
