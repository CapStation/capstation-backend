const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/capstation';
    
    console.log('🔌 Attempting to connect to MongoDB...');   
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully');
    
    mongoose.connection.on('error', (error) => {
      console.error('❌ Mongoose connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('📊 Mongoose disconnected from MongoDB');
    });

    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⚠️ Server continue without database connection');
    return false;
  }
};

module.exports = connectDB;
