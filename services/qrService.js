const QRCode = require("qrcode");

const DEFAULT_QR_FORMAT = "svg";
const DEFAULT_QR_SIZE = 220;
const MIN_QR_SIZE = 140;
const MAX_QR_SIZE = 480;
const QR_COLOR_DARK = "#0f40b9";
const QR_COLOR_LIGHT = "#ffffffff";

function normalizeQrFormat(format) {
  const normalizedFormat = String(format || "")
    .trim()
    .toLowerCase();

  return normalizedFormat === "png" ? "png" : DEFAULT_QR_FORMAT;
}

function normalizeQrSize(size) {
  const numericSize = Number.parseInt(String(size || ""), 10);
  if (!Number.isFinite(numericSize)) {
    return DEFAULT_QR_SIZE;
  }

  return Math.min(MAX_QR_SIZE, Math.max(MIN_QR_SIZE, numericSize));
}

function buildQrOptions(size, format) {
  return {
    type: format,
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: QR_COLOR_DARK,
      light: QR_COLOR_LIGHT,
    },
  };
}

function buildQrFilename(shortCode, format) {
  const safeCode = String(shortCode || "link").replace(/[^a-zA-Z0-9_-]/g, "");
  return `snaplink-${safeCode || "link"}-qr.${format}`;
}

async function generateQrSvg(content, size = DEFAULT_QR_SIZE) {
  return QRCode.toString(content, buildQrOptions(size, "svg"));
}

async function generateQrPngBuffer(content, size = DEFAULT_QR_SIZE) {
  return QRCode.toBuffer(content, buildQrOptions(size, "png"));
}

module.exports = {
  buildQrFilename,
  generateQrPngBuffer,
  generateQrSvg,
  normalizeQrFormat,
  normalizeQrSize,
};
