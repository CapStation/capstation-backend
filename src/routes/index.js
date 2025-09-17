const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const capstoneRoutes = require('./capstoneRoutes'); 
const dashboardRoutes = require('./dashboardRoutes');

router.use('/auth', authRoutes);
router.use('/capstones', capstoneRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
