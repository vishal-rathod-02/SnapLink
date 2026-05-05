const QRCode = require("qrcode");

const DEFAULT_QR_FORMAT = "svg";
const DEFAULT_QR_SIZE = 220;
const MIN_QR_SIZE = 140;
const MAX_QR_SIZE = 480;
const QR_COLOR_DARK = "#111111";
const QR_COLOR_LIGHT = "#ffffff";
const STYLED_QR_MARGIN = 2;
const STYLED_QR_EDGE_INSET = 0.12;
const STYLED_QR_EYE_OUTER_RADIUS = 1.75;
const STYLED_QR_EYE_MIDDLE_RADIUS = 1.15;
const STYLED_QR_EYE_INNER_RADIUS = 0.9;

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
    errorCorrectionLevel: "H",
    color: {
      dark: QR_COLOR_DARK,
      light: QR_COLOR_LIGHT,
    },
  };
}

function formatUnit(value) {
  return Number(value.toFixed(3)).toString();
}

function createQrMatrix(content) {
  return QRCode.create(content, {
    errorCorrectionLevel: "H",
    margin: 0,
  });
}

function isInsideFinderZone(x, y, size) {
  return (
    (x >= 0 && x < 7 && y >= 0 && y < 7) ||
    (x >= size - 7 && x < size && y >= 0 && y < 7) ||
    (x >= 0 && x < 7 && y >= size - 7 && y < size)
  );
}

function getModule(matrix, x, y) {
  if (x < 0 || y < 0 || x >= matrix.size || y >= matrix.size) {
    return false;
  }

  return Boolean(matrix.get(x, y));
}

function renderRoundedRect({ x, y, width, height, radius, fill }) {
  return `<rect x="${formatUnit(x)}" y="${formatUnit(y)}" width="${formatUnit(width)}" height="${formatUnit(height)}" rx="${formatUnit(radius)}" ry="${formatUnit(radius)}" fill="${fill}"/>`;
}

function renderFinderEye(startX, startY) {
  return [
    renderRoundedRect({
      x: startX,
      y: startY,
      width: 7,
      height: 7,
      radius: STYLED_QR_EYE_OUTER_RADIUS,
      fill: QR_COLOR_DARK,
    }),
    renderRoundedRect({
      x: startX + 1,
      y: startY + 1,
      width: 5,
      height: 5,
      radius: STYLED_QR_EYE_MIDDLE_RADIUS,
      fill: QR_COLOR_LIGHT,
    }),
    renderRoundedRect({
      x: startX + 2,
      y: startY + 2,
      width: 3,
      height: 3,
      radius: STYLED_QR_EYE_INNER_RADIUS,
      fill: QR_COLOR_DARK,
    }),
  ].join("");
}

function renderStyledModules(matrix, margin) {
  const parts = [];

  for (let y = 0; y < matrix.size; y += 1) {
    for (let x = 0; x < matrix.size; x += 1) {
      if (!getModule(matrix, x, y) || isInsideFinderZone(x, y, matrix.size)) {
        continue;
      }

      const hasLeft = getModule(matrix, x - 1, y);
      const hasRight = getModule(matrix, x + 1, y);
      const hasUp = getModule(matrix, x, y - 1);
      const hasDown = getModule(matrix, x, y + 1);

      const moduleX = margin + x;
      const moduleY = margin + y;
      const x1 = moduleX + (hasLeft ? 0 : STYLED_QR_EDGE_INSET);
      const y1 = moduleY + (hasUp ? 0 : STYLED_QR_EDGE_INSET);
      const x2 = moduleX + 1 - (hasRight ? 0 : STYLED_QR_EDGE_INSET);
      const y2 = moduleY + 1 - (hasDown ? 0 : STYLED_QR_EDGE_INSET);
      const width = Math.max(0.28, x2 - x1);
      const height = Math.max(0.28, y2 - y1);
      const radius = Math.min(width, height) * 0.5;

      parts.push(
        renderRoundedRect({
          x: x1,
          y: y1,
          width,
          height,
          radius,
          fill: QR_COLOR_DARK,
        }),
      );
    }
  }

  return parts.join("");
}

function buildStyledQrSvg(content, size = DEFAULT_QR_SIZE) {
  const qrData = createQrMatrix(content);
  const matrix = qrData.modules;
  const canvasSize = matrix.size + STYLED_QR_MARGIN * 2;
  const topLeftEye = renderFinderEye(STYLED_QR_MARGIN, STYLED_QR_MARGIN);
  const topRightEye = renderFinderEye(
    STYLED_QR_MARGIN + matrix.size - 7,
    STYLED_QR_MARGIN,
  );
  const bottomLeftEye = renderFinderEye(
    STYLED_QR_MARGIN,
    STYLED_QR_MARGIN + matrix.size - 7,
  );
  const moduleMarkup = renderStyledModules(matrix, STYLED_QR_MARGIN);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${canvasSize} ${canvasSize}" fill="none" shape-rendering="geometricPrecision">`,
    `<rect width="${canvasSize}" height="${canvasSize}" rx="${formatUnit(STYLED_QR_MARGIN * 1.2)}" fill="${QR_COLOR_LIGHT}"/>`,
    topLeftEye,
    topRightEye,
    bottomLeftEye,
    moduleMarkup,
    "</svg>",
  ].join("");
}

function buildQrFilename(shortCode, format) {
  const safeCode = String(shortCode || "link").replace(/[^a-zA-Z0-9_-]/g, "");
  return `snaplink-${safeCode || "link"}-qr.${format}`;
}

async function generateQrSvg(content, size = DEFAULT_QR_SIZE) {
  return buildStyledQrSvg(content, size);
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
