const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const capstoneRoutes = require('./capstoneRoutes'); 
const groupRoutes = require('./groupRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const announcementRoutes = require('./announcementRoutes');

router.use('/auth', authRoutes);
router.use('/capstones', capstoneRoutes);
router.use('/groups', groupRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/announcements', announcementRoutes);

module.exports = router;
