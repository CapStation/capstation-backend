const express = require('express');
const { register, login } = require('../controllers/authController');

const router = express.Router();

/**
 * Auth Routes for CapStation API
 * POST /api/auth/register - Register new user
 * POST /api/auth/login - Login user
 */

// Register new user
router.post('/register', register);

// Login user
router.post('/login', login);

module.exports = router;