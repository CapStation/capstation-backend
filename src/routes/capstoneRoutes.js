const express = require('express');
const router = express.Router();
const capstoneController = require('../controllers/capstoneController');
const { authMiddleware, requireRole } = require('../middlewares/authMiddleware');

// Get all capstones with optional filtering
router.get('/', authMiddleware, capstoneController.getAllCapstones);

// Get capstones milik user yang sedang login
router.get('/my-projects', authMiddleware, capstoneController.getMyCapstones);

// Get detail capstone by ID
router.get('/:id', authMiddleware, capstoneController.getCapstoneById);

// Update status capstone - hanya owner yang bisa mengubah
router.patch('/:id/status', authMiddleware, capstoneController.updateCapstoneStatus);

module.exports = router;
