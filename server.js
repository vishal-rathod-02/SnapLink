require("dotenv").config({ quiet: true });

const app = require("./app");
const { connectDatabase } = require("./config/database");

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    await connectDatabase();
    console.log("Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
