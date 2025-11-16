const express = require('express');
const router = express.Router();
const { createAnnouncement, getAnnouncements } = require('../controllers/announcementController');
const { authMiddleware, requireRole } = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, requireRole('admin', 'dosen'), createAnnouncement);

router.get('/', getAnnouncements);

module.exports = router;