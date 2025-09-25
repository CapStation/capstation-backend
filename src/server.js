require("dotenv").config();
const app = require("./app");
const mongoose = require("mongoose");
const connectDB = require("./configs/db");

// Set timezone to GMT+7 (Asia/Jakarta)
process.env.TZ = "Asia/Jakarta";

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🔄 Shutting down...");
  try {
    await mongoose.connection.close();
    console.log("✅ MongoDB connection closed");
  } catch (error) {
    console.log("⚠️ MongoDB was not connected");
  }
  process.exit(0);
});

const PORT = process.env.PORT || 5000;

(async () => {
  const connected = await connectDB();
  if (!connected) {
    console.error("❌ Server not started. Database connection failed.");
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`🚀 CapStation API Server running on port ${PORT}`);
    console.log(`📖 API Documentation: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`💾 Database Status: Connected`);
  });
})();
