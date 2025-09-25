const express = require('express');
const DocumentController = require('../controllers/DocumentController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const fileValidation = require('../middlewares/fileValidation');
const { upload, uploadSingle, handleMulterError } = require('../middlewares/upload');

const router = express.Router();
const documentController = new DocumentController();

// Public routes (no auth required)
router.get('/stats', documentController.getDocumentStatistics.bind(documentController));
router.get('/categories', documentController.getDocumentCategories.bind(documentController));

// Filter berbasis Tema (public)
router.get('/tema/:tema', documentController.getDocumentsByTema.bind(documentController));
router.get('/tema/:tema/stats', documentController.getDocumentStatsByTema.bind(documentController));

// Filter berbasis Kategori Capstone (public)
router.get('/category/:capstoneCategory', documentController.getDocumentsByCapstoneCategory.bind(documentController));
router.get('/project/:projectId/category/:capstoneCategory', documentController.getProjectDocumentsByCategory.bind(documentController));
router.get('/', documentController.getAllDocuments.bind(documentController));
router.get('/project/:projectId', documentController.getDocumentsByProject.bind(documentController));
router.get('/:id', documentController.getDocumentById.bind(documentController));
router.get('/:id/download', documentController.downloadDocument.bind(documentController));

// Protected routes (auth required)
router.use(authMiddleware); // Apply auth middleware to all routes below

router.post('/', 
  uploadSingle('file'), 
  handleMulterError,
  fileValidation.validateFileUpload,
  documentController.uploadDocument.bind(documentController)
);
router.get('/:id/debug', documentController.debugDocument.bind(documentController));
router.put('/:id', documentController.updateDocument.bind(documentController));
router.put('/:id/file', 
  upload.single('file'), 
  handleMulterError, 
  fileValidation.validateFileUpload, 
  documentController.replaceDocumentFile.bind(documentController)
);
router.delete('/:id', documentController.deleteDocument.bind(documentController));

// bulk operations
router.post('/bulk-delete', documentController.bulkDeleteDocuments.bind(documentController));

module.exports = router;