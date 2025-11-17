const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { 
  validateCompetency, 
  validateCompetencies, 
  validateCompetencySearch, 
  validateUserId, 
  validateCompetencyIndex 
} = require('../middlewares/userValidator');

// User list route (with optional role filter)
router.get('/', authMiddleware, userController.getUsers);

// Export users route
router.get('/export', authMiddleware, userController.exportUsers);

// Validate user role (Admin only)
router.patch('/:userId/validate-role', authMiddleware, userController.validateUserRole);

// Admin: Update and delete user
router.put('/:userId', authMiddleware, userController.updateUser);
router.delete('/:userId', authMiddleware, userController.deleteUser);

// Profile routes
router.get('/profile', authMiddleware, userController.getMyProfile);
router.get('/profile/:userId', authMiddleware, validateUserId, userController.getUserProfile);

// Competency CRUD routes
router.get('/competencies', authMiddleware, userController.getMyCompetencies);
router.post('/competencies', authMiddleware, validateCompetency, userController.addCompetency);
router.put('/competencies/:index', authMiddleware, validateCompetencyIndex, validateCompetency, userController.updateCompetency);
router.delete('/competencies/:index', authMiddleware, validateCompetencyIndex, userController.deleteCompetency);
router.put('/competencies', authMiddleware, validateCompetencies, userController.setCompetencies);

// Search routes
router.get('/search', authMiddleware, validateCompetencySearch, userController.searchUsersByCompetency);

module.exports = router;
