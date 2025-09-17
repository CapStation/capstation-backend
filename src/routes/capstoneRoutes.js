const express = require('express');
const router = express.Router();
const capstoneController = require('../controllers/capstoneController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Buat capstone (pemilik proyek)
router.post('/', authMiddleware, capstoneController.createCapstone);

// Detail capstone
router.get('/:id', authMiddleware, capstoneController.getCapstoneById);

module.exports = router;
