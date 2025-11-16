const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!uri) {
      throw new Error("MongoDB URI not found in environment variables");
    }

    console.log("🔌 Attempting to connect to MongoDB...");

    // Optimized settings for both local and serverless environments
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    });

    console.log("✅ MongoDB connected successfully");

    mongoose.connection.on("error", (error) => {
      console.error("❌ Mongoose connection error:", error);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("📊 Mongoose disconnected from MongoDB");
    });

    return true;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.log("⚠️ Server continuing without database connection");
    return false;
  }
};

module.exports = connectDB;
