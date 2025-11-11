/**
 * Vercel Serverless Function Entry Point
 * This file is required for Vercel deployment to work properly
 *
 * Unlike traditional Express servers that use app.listen(),
 * Vercel requires a serverless handler that processes each request
 */

// Set timezone to Asia/Jakarta for serverless function
process.env.TZ = "Asia/Jakarta";

const app = require("../src/app");

// Export the Express app as a serverless function handler
// Vercel will call this function for each incoming request
module.exports = app;
