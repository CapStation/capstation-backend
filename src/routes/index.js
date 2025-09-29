const express = require('express');
const authRoutes = require('./authRoutes');
const projectRoutes = require('./projects');
const oauthRoutes = require('./oauthRoutes');
const documentRoutes = require('./documents');
const requestDecisionRoutes = require('./requestDecisionRoutes');
const capstoneBrowseRoutes = require('./capstoneBrowseRoutes');
const capstoneRoutes = require('./capstoneRoutes');
const announcementRoutes = require('./announcementRoutes');
const groupRoutes = require('./groupRoutes');
const dashboardRoutes = require('./dashboardRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Capstone API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});


router.use('/auth', authRoutes);
router.use('/auth/oauth', oauthRoutes);
router.use('/projects', projectRoutes);
router.use('/announcements', announcementRoutes);
router.use('/groups', groupRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/capstones', capstoneRoutes);
router.use('/documents', documentRoutes);
router.use(requestDecisionRoutes);            
router.use('/browse', capstoneBrowseRoutes);  

module.exports = router;
