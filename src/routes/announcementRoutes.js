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
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, createAnnouncement); //create
router.get('/', getAnnouncements); //read all
router.get('/:id', getAnnouncementById); //read one
router.put('/:id', authMiddleware, updateAnnouncement); //update
router.delete('/:id', authMiddleware, deleteAnnouncement); //delete

module.exports = router;