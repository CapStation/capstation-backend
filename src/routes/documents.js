const express = require('express');
const DocumentController = require('../controllers/DocumentController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { requireProjectMembership, requireProjectMembershipForCreate } = require('../middlewares/documentAuth');
const fileValidation = require('../middlewares/fileValidation');
const { upload, uploadSingle, handleMulterError } = require('../middlewares/upload');

const router = express.Router();
const documentController = new DocumentController();

// Public routes (no auth required)
router.get('/stats', documentController.getDocumentStatistics.bind(documentController));
router.get('/categories', documentController.getDocumentCategories.bind(documentController));

// Protected routes for reading documents (auth required)
router.get('/tema/:tema', authMiddleware, documentController.getDocumentsByTema.bind(documentController));
router.get('/tema/:tema/stats', authMiddleware, documentController.getDocumentStatsByTema.bind(documentController));

// Filter berbasis Kategori Capstone (auth required)
router.get('/category/:capstoneCategory', authMiddleware, documentController.getDocumentsByCapstoneCategory.bind(documentController));
router.get('/project/:projectId/category/:capstoneCategory', authMiddleware, documentController.getProjectDocumentsByCategory.bind(documentController));
router.get('/', authMiddleware, documentController.getAllDocuments.bind(documentController));
router.get('/project/:projectId', authMiddleware, documentController.getDocumentsByProject.bind(documentController));

// Protected routes for reading individual documents (auth required)
router.get('/:id', authMiddleware, documentController.getDocumentById.bind(documentController));
router.get('/:id/download', authMiddleware, documentController.downloadDocument.bind(documentController));

// Protected routes (auth + project membership required)
router.post('/', 
  authMiddleware,
  uploadSingle('file'), 
  handleMulterError,
  fileValidation.validateFileUpload,
  requireProjectMembershipForCreate,
  documentController.uploadDocument.bind(documentController)
);

router.get('/:id/debug', authMiddleware, requireProjectMembership, documentController.debugDocument.bind(documentController));
router.put('/:id', authMiddleware, requireProjectMembership, documentController.updateDocument.bind(documentController));
router.put('/:id/file', 
  authMiddleware,
  requireProjectMembership,
  upload.single('file'), 
  handleMulterError, 
  fileValidation.validateFileUpload, 
  documentController.replaceDocumentFile.bind(documentController)
);
router.delete('/:id', authMiddleware, requireProjectMembership, documentController.deleteDocument.bind(documentController));

// bulk operations - only admin for now
router.post('/bulk-delete', authMiddleware, documentController.bulkDeleteDocuments.bind(documentController));

module.exports = router;