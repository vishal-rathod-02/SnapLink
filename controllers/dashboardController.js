const { getDashboardSnapshot } = require("../services/dashboardService");
const { getBaseUrl } = require("../utils/request");

const ALLOWED_SORTS = new Set([
  "newest",
  "oldest",
  "clicks_desc",
  "clicks_asc",
  "alias_az",
]);
const ALLOWED_LINK_TYPES = new Set(["all", "custom", "default"]);

function normalizeDashboardQuery(query = {}) {
  const searchTerm = String(query.q || "").trim().slice(0, 120);
  const linkType = ALLOWED_LINK_TYPES.has(String(query.linkType || ""))
    ? String(query.linkType)
    : "all";
  const sortBy = ALLOWED_SORTS.has(String(query.sort || "")) ? String(query.sort) : "newest";
  const parsedPage = Number.parseInt(String(query.page || "1"), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  return {
    searchTerm,
    linkType,
    sortBy,
    page,
  };
}

function buildDashboardUrl(basePath, currentQuery, overrides = {}) {
  const mergedQuery = {
    q: currentQuery.searchTerm,
    linkType: currentQuery.linkType,
    sort: currentQuery.sortBy,
    page: currentQuery.page,
    ...overrides,
  };

  const params = new URLSearchParams();
  if (mergedQuery.q) {
    params.set("q", mergedQuery.q);
  }
  if (mergedQuery.linkType && mergedQuery.linkType !== "all") {
    params.set("linkType", mergedQuery.linkType);
  }
  if (mergedQuery.sort && mergedQuery.sort !== "newest") {
    params.set("sort", mergedQuery.sort);
  }
  const resolvedPage = Number(mergedQuery.page) || 1;
  if (resolvedPage > 1) {
    params.set("page", String(resolvedPage));
  }

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

function buildPagination(currentPage, totalPages, buildPageUrl) {
  if (totalPages <= 1) {
    return [];
  }

  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  const pages = [];

  for (let page = startPage; page <= endPage; page += 1) {
    pages.push({
      number: page,
      isCurrent: page === currentPage,
      url: buildPageUrl(page),
    });
  }

  return pages;
}

async function renderDashboard(req, res) {
  const dashboardQuery = normalizeDashboardQuery(req.query);
  const snapshot = await getDashboardSnapshot(req.currentUser?._id, dashboardQuery);
  const dashboardPath = "/dashboard";
  const resolvedDashboardQuery = {
    ...dashboardQuery,
    searchTerm: snapshot.management.appliedFilters.searchTerm,
    linkType: snapshot.management.appliedFilters.linkType,
    sortBy: snapshot.management.appliedFilters.sortBy,
    page: snapshot.management.currentPage,
  };
  const buildPageUrl = (page) =>
    buildDashboardUrl(dashboardPath, resolvedDashboardQuery, {
      page,
    });

  res.render("dashboard", {
    pageTitle: "SnapLink Dashboard - Activity Insights",
    activePage: "dashboard",
    baseUrl: getBaseUrl(req),
    dashboardQuery: resolvedDashboardQuery,
    dashboardUrl: buildDashboardUrl(dashboardPath, resolvedDashboardQuery),
    dashboardResetUrl: dashboardPath,
    dashboardPagination: buildPagination(
      snapshot.management.currentPage,
      snapshot.management.totalPages,
      buildPageUrl,
    ),
    dashboardPrevUrl:
      snapshot.management.currentPage > 1
        ? buildPageUrl(snapshot.management.currentPage - 1)
        : null,
    dashboardNextUrl:
      snapshot.management.currentPage < snapshot.management.totalPages
        ? buildPageUrl(snapshot.management.currentPage + 1)
        : null,
    ...snapshot,
  });
}

module.exports = {
  renderDashboard,
};
