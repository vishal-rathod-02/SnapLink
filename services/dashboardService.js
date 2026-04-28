const mongoose = require("mongoose");

const ActivityLog = require("../models/ActivityLog");
const ShortUrl = require("../models/ShortUrl");

const DASHBOARD_TIMEZONE = process.env.DASHBOARD_TIMEZONE || "Asia/Kolkata";
const DASHBOARD_PAGE_SIZE = 8;
const DASHBOARD_SORT_MAP = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  clicks_desc: { clicks: -1, createdAt: -1 },
  clicks_asc: { clicks: 1, createdAt: -1 },
  alias_az: { shortCode: 1, createdAt: -1 },
};

function toDateKeyInTimezone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = {};
  parts.forEach((part) => {
    if (part.type === "year" || part.type === "month" || part.type === "day") {
      values[part.type] = part.value;
    }
  });

  return `${values.year}-${values.month}-${values.day}`;
}

function buildLast7DayLabels(timeZone) {
  const labels = [];

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    labels.push(toDateKeyInTimezone(date, timeZone));
  }

  return labels;
}

function mapSeriesByLabel(rows, labels) {
  const lookup = new Map(rows.map((row) => [row._id, row.count]));
  return labels.map((label) => lookup.get(label) || 0);
}

function buildChartLabels(labels) {
  return labels.map((label) => {
    const [year, month, day] = label.split("-").map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    return utcDate.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    });
  });
}

function toObjectId(value) {
  if (!value) {
    return null;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  return new mongoose.Types.ObjectId(String(value));
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildLibraryQuery(ownerObjectId, options = {}) {
  const query = {
    owner: ownerObjectId,
  };

  if (options.linkType === "custom") {
    query.isCustomAlias = true;
  } else if (options.linkType === "default") {
    query.isCustomAlias = false;
  }

  if (options.searchTerm) {
    const regex = new RegExp(escapeRegExp(options.searchTerm), "i");
    query.$or = [{ shortCode: regex }, { originalUrl: regex }];
  }

  return query;
}

async function getDashboardSnapshot(ownerId, options = {}) {
  const ownerObjectId = toObjectId(ownerId);
  const labels = buildLast7DayLabels(DASHBOARD_TIMEZONE);
  const chartLabels = buildChartLabels(labels);
  const currentPage = Math.max(1, Number(options.page) || 1);
  const sortBy = DASHBOARD_SORT_MAP[options.sortBy] ? options.sortBy : "newest";

  if (!ownerObjectId) {
    return {
      stats: {
        totalUrls: 0,
        totalClicks: 0,
        totalActivities: 0,
        avgClicksPerUrl: 0,
      },
      topUrls: [],
      recentUrls: [],
      recentActivity: [],
      charts: {
        labels: chartLabels,
        urlSeries: labels.map(() => 0),
        clickSeries: labels.map(() => 0),
        maxDaily: 1,
        totalCreatedInWindow: 0,
        totalVisitsInWindow: 0,
        hasTrendActivity: false,
      },
      management: {
        items: [],
        totalItems: 0,
        pageSize: DASHBOARD_PAGE_SIZE,
        currentPage: 1,
        totalPages: 1,
        appliedFilters: {
          searchTerm: "",
          linkType: "all",
          sortBy: "newest",
        },
      },
    };
  }

  const startDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  const ownerMatch = { owner: ownerObjectId };
  const libraryQuery = buildLibraryQuery(ownerObjectId, options);

  const [
    totalUrls,
    totalActivities,
    totalClicksAgg,
    topUrls,
    recentUrls,
    recentActivity,
    creationRows,
    visitRows,
    libraryTotalItems,
  ] = await Promise.all([
    ShortUrl.countDocuments(ownerMatch),
    ActivityLog.countDocuments(ownerMatch),
    ShortUrl.aggregate([
      { $match: ownerMatch },
      { $group: { _id: null, clicks: { $sum: "$clicks" } } },
    ]),
    ShortUrl.find(ownerMatch).sort({ clicks: -1, createdAt: -1 }).limit(6).lean(),
    ShortUrl.find(ownerMatch).sort({ createdAt: -1 }).limit(10).lean(),
    ActivityLog.find(ownerMatch).sort({ createdAt: -1 }).limit(12).lean(),
    ShortUrl.aggregate([
      { $match: { ...ownerMatch, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: DASHBOARD_TIMEZONE,
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    ActivityLog.aggregate([
      { $match: { ...ownerMatch, createdAt: { $gte: startDate }, type: "VISITED" } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: DASHBOARD_TIMEZONE,
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    ShortUrl.countDocuments(libraryQuery),
  ]);

  const totalPages = Math.max(1, Math.ceil(libraryTotalItems / DASHBOARD_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const managementItems = await ShortUrl.find(libraryQuery)
    .sort(DASHBOARD_SORT_MAP[sortBy])
    .skip((safeCurrentPage - 1) * DASHBOARD_PAGE_SIZE)
    .limit(DASHBOARD_PAGE_SIZE)
    .lean();

  const urlSeries = mapSeriesByLabel(creationRows, labels);
  const clickSeries = mapSeriesByLabel(visitRows, labels);
  const totalCreatedInWindow = urlSeries.reduce((sum, value) => sum + value, 0);
  const totalVisitsInWindow = clickSeries.reduce((sum, value) => sum + value, 0);

  return {
    stats: {
      totalUrls,
      totalClicks: totalClicksAgg[0]?.clicks || 0,
      totalActivities,
      avgClicksPerUrl:
        totalUrls > 0
          ? Number(((totalClicksAgg[0]?.clicks || 0) / totalUrls).toFixed(2))
          : 0,
    },
    topUrls,
    recentUrls,
    recentActivity,
    charts: {
      labels: chartLabels,
      urlSeries,
      clickSeries,
      maxDaily: Math.max(1, ...urlSeries, ...clickSeries),
      totalCreatedInWindow,
      totalVisitsInWindow,
      hasTrendActivity: totalCreatedInWindow + totalVisitsInWindow > 0,
    },
    management: {
      items: managementItems,
      totalItems: libraryTotalItems,
      pageSize: DASHBOARD_PAGE_SIZE,
      currentPage: safeCurrentPage,
      totalPages,
      appliedFilters: {
        searchTerm: options.searchTerm || "",
        linkType: options.linkType || "all",
        sortBy,
      },
    },
  };
}

module.exports = {
  getDashboardSnapshot,
};
