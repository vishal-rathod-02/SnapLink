const ActivityLog = require("../models/ActivityLog");
const ShortUrl = require("../models/ShortUrl");

const DASHBOARD_TIMEZONE = process.env.DASHBOARD_TIMEZONE || "Asia/Kolkata";

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

async function getDashboardSnapshot() {
  const labels = buildLast7DayLabels(DASHBOARD_TIMEZONE);
  const startDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

  const [
    totalUrls,
    totalActivities,
    totalClicksAgg,
    topUrls,
    recentUrls,
    recentActivity,
    creationRows,
    visitRows,
  ] = await Promise.all([
    ShortUrl.countDocuments(),
    ActivityLog.countDocuments(),
    ShortUrl.aggregate([{ $group: { _id: null, clicks: { $sum: "$clicks" } } }]),
    ShortUrl.find().sort({ clicks: -1, createdAt: -1 }).limit(6).lean(),
    ShortUrl.find().sort({ createdAt: -1 }).limit(10).lean(),
    ActivityLog.find().sort({ createdAt: -1 }).limit(12).lean(),
    ShortUrl.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
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
      { $match: { createdAt: { $gte: startDate }, type: "VISITED" } },
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
  ]);

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
      labels: buildChartLabels(labels),
      urlSeries,
      clickSeries,
      maxDaily: Math.max(1, ...urlSeries, ...clickSeries),
      totalCreatedInWindow,
      totalVisitsInWindow,
      hasTrendActivity: totalCreatedInWindow + totalVisitsInWindow > 0,
    },
  };
}

module.exports = {
  getDashboardSnapshot,
};
