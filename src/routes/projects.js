const express = require('express');
const ProjectController = require('../controllers/ProjectController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();
const projectController = new ProjectController().bind();

// Public routes (no auth required)
router.get('/temas', projectController.getAvailableTemas);
router.get('/categories', projectController.getCategories);
router.get('/statistics', projectController.getProjectStatistics);
router.post('/search', projectController.advancedSearch);

// Theme-based filtering routes projects (public)
router.get('/tema/:tema', projectController.getProjectsByTema);
router.get('/available', projectController.getAvailableProjects);
router.get('/', projectController.getAllProjects);

// Protected routes (auth required) - MOVE my-projects BEFORE /:id route
router.get('/my-projects', authMiddleware, projectController.getMyProjects);

// Public route for getting project by ID
router.get('/:id', projectController.getProjectById);

// Other protected routes (auth required)
router.use(authMiddleware); // Apply auth middleware to all routes below

router.post('/', projectController.createProject);
router.get('/:id/documents', projectController.getProjectDocuments);
router.put('/:id', projectController.updateProject);
router.patch('/:id/status', projectController.updateProjectStatus);
router.delete('/:id', projectController.deleteProject);

module.exports = router;