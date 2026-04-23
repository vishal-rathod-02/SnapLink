const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/url_shortener";

async function connectDatabase() {
  await mongoose.connect(MONGODB_URI);
}

module.exports = {
  connectDatabase,
};

