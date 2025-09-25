const express = require('express');
const authRoutes = require('./authRoutes');
const projectRoutes = require('./projects');
const oauthRoutes = require('./oauthRoutes');
const documentRoutes = require('./documents');
const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running ✅',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

router.use("/auth", authRoutes);
router.use("/auth/oauth", oauthRoutes);
router.use("/projects", projectRoutes);
router.use('/documents', documentRoutes);

module.exports = router;
