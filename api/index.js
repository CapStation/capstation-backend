/**
 * Vercel Serverless Function Entry Point
 * This file is required for Vercel deployment to work properly
 *
 * Unlike traditional Express servers that use app.listen(),
 * Vercel requires a serverless handler that processes each request
 */

// Set timezone to Asia/Jakarta for serverless function
process.env.TZ = "Asia/Jakarta";

const mongoose = require("mongoose");
const app = require("../src/app");

// Cache MongoDB connection across serverless invocations
let cachedConnection = null;

/**
 * Ensure MongoDB is connected before handling requests
 * Reuses existing connection if available (serverless optimization)
 */
async function ensureDbConnection() {
  // If already connected, return immediately
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!uri) {
      console.error('❌ No MongoDB URI found in environment variables');
      throw new Error('MongoDB URI not configured');
    }

    console.log('🔌 Connecting to MongoDB for serverless function...');
    
    // Connect with serverless-optimized settings
    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      maxPoolSize: 10, // Limit connection pool for serverless
    });
    
    cachedConnection = connection;
    console.log('✅ MongoDB connected successfully (serverless)');
    
    return connection;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    cachedConnection = null;
    throw error;
  }
}

/**
 * Serverless function handler
 * Ensures DB connection before processing request
 */
module.exports = async (req, res) => {
  try {
    // Ensure database is connected
    await ensureDbConnection();
    
    // Process the request with Express app
    return app(req, res);
  } catch (error) {
    console.error('❌ Serverless function error:', error);
    
    // Return error response if DB connection fails
    return res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable. Database connection failed.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

