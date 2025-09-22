const express = require('express');
const authRoutes = require('./auth');
const projectRoutes = require('./projects');
const documentRoutes = require('./documents');

const router = express.Router();

// system health endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CapStation API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/documents', documentRoutes);

module.exports = router;
