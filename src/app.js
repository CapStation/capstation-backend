const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./configs/db');
require('dotenv').config();

// Set timezone to Jakarta (WIB) - UTC+7
process.env.TZ = 'Asia/Jakarta';

// Import routes
const apiRoutes = require('./routes');

const app = express();

// Initialize database connection
const initializeDB = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error('Database initialization failed:', error.message);
  }
};

initializeDB();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploaded documents
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health endpoint
app.get('/health', (req, res) => res.json({ ok: true, time: new Date() }));

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to CapStation API',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  
  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File terlalu besar. Maksimal 10MB.',
      data: null
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Field file tidak sesuai yang diharapkan.',
      data: null
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => error.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors,
      data: null
    });
  }

  // cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      data: null
    });
  }

  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} sudah ada`,
      data: null
    });
  }

  // Default 
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal Server Error',
    success: false,
    data: null
  });
});

module.exports = app;
