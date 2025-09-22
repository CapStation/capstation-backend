const express = require('express');
const router = express.Router();
const capstoneController = require('../controllers/capstoneController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.get('/:id', authMiddleware, capstoneController.getCapstoneById);

module.exports = router;
