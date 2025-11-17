const express = require('express');
const ProjectController = require('../controllers/ProjectController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { requireRole, requireOwnershipOrRole } = require('../middlewares/roleMiddleware');
const Project = require('../models/Project');

const router = express.Router();
const projectController = new ProjectController().bind();

// Debug: log controller handler types to catch invalid handlers
try {
	console.log('ProjectController handlers:', {
		getAvailableTemas: typeof projectController.getAvailableTemas,
		getCategories: typeof projectController.getCategories,
		getProjectStatistics: typeof projectController.getProjectStatistics,
		advancedSearch: typeof projectController.advancedSearch
	});
} catch (e) {
	console.error('Error while inspecting ProjectController handlers:', e);
}

// Public routes (no auth required)
router.get('/temas', projectController.getAvailableTemas);
router.get('/categories', projectController.getCategories);
router.get('/statistics', projectController.getProjectStatistics);
router.post('/search', projectController.advancedSearch);

// Export route (auth required)
router.get('/export', authMiddleware, projectController.exportProjects);

// Theme-based filtering routes projects (public)
router.get('/tema/:tema', projectController.getProjectsByTema);
router.get('/available', projectController.getAvailableProjects);
router.get('/', projectController.getAllProjects);

// Protected routes (auth required) - MOVE my-projects BEFORE /:id route
console.log('ProjectController additional handlers:', {
	getMyProjects: typeof projectController.getMyProjects,
	getProjectById: typeof projectController.getProjectById,
	createProject: typeof projectController.createProject,
	getProjectDocuments: typeof projectController.getProjectDocuments
});

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

// Update project group (owner, admin, dosen can update group)
router.patch('/:id/group', requireOwnershipOrRole(Project, 'owner', 'id', 'admin', 'dosen'), projectController.updateProjectGroup);

// Delete project (only owner/members or admin can delete)
router.delete('/:id', requireOwnershipOrRole(Project, 'members', 'id', 'admin'), projectController.deleteProject);

router.get('/:id/competencies', projectController.getProjectCompetencies);
router.post('/:id/competencies', authMiddleware, requireOwnershipOrRole(Project, 'members', 'id', 'admin', 'dosen'), projectController.addProjectCompetency);
router.delete('/:id/competencies/:index', authMiddleware, requireOwnershipOrRole(Project, 'members', 'id', 'admin', 'dosen'), projectController.removeProjectCompetency);

module.exports = router;