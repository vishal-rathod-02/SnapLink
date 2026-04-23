function getClientIp(req) {
  const forwardedIp = req.headers["x-forwarded-for"];
  if (typeof forwardedIp === "string" && forwardedIp.trim()) {
    return forwardedIp.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
}

function getBaseUrl(req) {
  const forwardedProtocol = req.headers["x-forwarded-proto"];
  const protocol =
    typeof forwardedProtocol === "string" && forwardedProtocol.trim()
      ? forwardedProtocol.split(",")[0].trim()
      : req.protocol;

  return `${protocol}://${req.get("host")}`;
}

module.exports = {
  getBaseUrl,
  getClientIp,
};

