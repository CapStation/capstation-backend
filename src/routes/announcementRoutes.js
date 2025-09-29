//announcementRoutes.js
const express = require('express');
const router = express.Router();
const { 
    createAnnouncement, 
    getAnnouncements,
    getAnnouncementById,
    updateAnnouncement,
    deleteAnnouncement 
} = require('../controllers/announcementController');
const { authMiddleware, requireRole } = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, requireRole('admin', 'dosen'), createAnnouncement); //create
router.get('/', getAnnouncements); //read all
router.get('/:id', getAnnouncementById); //read one
router.put('/:id', authMiddleware, requireRole('admin', 'dosen'), updateAnnouncement); //update
router.delete('/:id', authMiddleware, requireRole('admin', 'dosen'), deleteAnnouncement); //delete

module.exports = router;