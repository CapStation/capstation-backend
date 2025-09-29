const express = require('express');
const router = express.Router();
const competencyController = require('../controllers/competencyController');
const { authMiddleware, requireRole } = require('../middlewares/authMiddleware');
const { validateCompetencyCreate, validateCompetencyUpdate } = require('../middlewares/competencyValidator');

// Public routes (semua user yang sudah login bisa akses)
router.get('/', authMiddleware, competencyController.getAllCompetencies);
router.get('/categories', authMiddleware, competencyController.getCompetencyCategories);
router.get('/by-category', authMiddleware, competencyController.getCompetenciesByCategory);

// Admin only routes
router.post('/', authMiddleware, requireRole('admin'), validateCompetencyCreate, competencyController.createCompetency);
router.put('/:id', authMiddleware, requireRole('admin'), validateCompetencyUpdate, competencyController.updateCompetency);
router.delete('/:id', authMiddleware, requireRole('admin'), competencyController.deleteCompetency);

module.exports = router;
