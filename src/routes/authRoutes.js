const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate } = require('../middlewares/authValidator');

router.post('/register',
  [
    body('name').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
  ],
  validate,
  authController.register
);

router.post('/login',
  [
    body('email').isEmail(),
    body('password').notEmpty()
  ],
  validate,
  authController.login
);

module.exports = router;
