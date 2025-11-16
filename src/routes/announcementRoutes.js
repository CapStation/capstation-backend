const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { 
  createAnnouncement, 
  getAnnouncements,
  getAnnouncementDetail,
  updateAnnouncement,
  deleteAnnouncement,
  getDashboardAnnouncements
} = require('../controllers/announcementController');
const { authMiddleware, requireRole } = require('../middlewares/authMiddleware');

// Get dashboard announcements (latest 5)
router.get('/dashboard/latest', authMiddleware, getDashboardAnnouncements);

// Get all announcements with filters
router.get('/', getAnnouncements);

// Create announcement (Admin/Dosen only)
router.post(
  '/',
  authMiddleware,
  requireRole('admin', 'dosen'),
  [
    body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Judul harus 3-200 karakter'),
    body('content').trim().isLength({ min: 10 }).withMessage('Konten minimal 10 karakter'),
    body('category').optional().isIn(['akademik', 'pengumuman', 'peringatan', 'informasi', 'lainnya']),
    body('targetAudience').optional().isIn(['semua', 'mahasiswa', 'dosen', 'admin']),
    body('status').optional().isIn(['published', 'draft']),
    body('isImportant').optional().isBoolean()
  ],
  createAnnouncement
);

// Get announcement detail
router.get('/:id', getAnnouncementDetail);

// Update announcement (Creator only, must be Admin/Dosen)
router.put(
  '/:id',
  authMiddleware,
  requireRole('admin', 'dosen'),
  [
    body('title').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Judul harus 3-200 karakter'),
    body('content').optional().trim().isLength({ min: 10 }).withMessage('Konten minimal 10 karakter'),
    body('category').optional().isIn(['akademik', 'pengumuman', 'peringatan', 'informasi', 'lainnya']),
    body('targetAudience').optional().isIn(['semua', 'mahasiswa', 'dosen', 'admin']),
    body('status').optional().isIn(['published', 'draft']),
    body('isImportant').optional().isBoolean()
  ],
  updateAnnouncement
);

// Delete announcement (Creator only, must be Admin/Dosen)
router.delete(
  '/:id',
  authMiddleware,
  requireRole('admin', 'dosen'),
  deleteAnnouncement
);

module.exports = router;