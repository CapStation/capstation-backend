const express = require('express');
const router = express.Router();
const { searchUserByEmail, getCurrentUser, getAllUsers } = require('../controllers/userController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Get current user
router.get('/me', authMiddleware, getCurrentUser);

// Search user by email (protected - for group invites)
router.get('/search', authMiddleware, searchUserByEmail);

// DEBUG: List all users (for development/debugging)
router.get('/debug/all', authMiddleware, getAllUsers);

module.exports = router;
