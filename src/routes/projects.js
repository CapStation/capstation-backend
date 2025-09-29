const express = require('express');
const ProjectController = require('../controllers/ProjectController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { requireRole, requireOwnershipOrRole } = require('../middlewares/roleMiddleware');
const Project = require('../models/Project');

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

// Create project (mahasiswa, dosen, admin can create)
router.post('/', requireRole('mahasiswa', 'dosen', 'admin'), projectController.createProject);

// Get project documents (members, supervisor, admin can view)
router.get('/:id/documents', requireOwnershipOrRole(Project, 'members', 'id', 'admin', 'dosen'), projectController.getProjectDocuments);

// Update project (owner/members, supervisor, admin can edit)
router.put('/:id', requireOwnershipOrRole(Project, 'members', 'id', 'admin', 'dosen'), projectController.updateProject);

// Update project status (owner/members, supervisor, admin can update status)
router.patch('/:id/status', requireOwnershipOrRole(Project, 'members', 'id', 'admin', 'dosen'), projectController.updateProjectStatus);

// Delete project (only owner/members or admin can delete)
router.delete('/:id', requireOwnershipOrRole(Project, 'members', 'id', 'admin'), projectController.deleteProject);

module.exports = router;