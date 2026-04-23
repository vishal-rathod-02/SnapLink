const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI;

async function connectDatabase() {
  await mongoose.connect(MONGODB_URI);
}

module.exports = {
  connectDatabase,
};

