const DocumentService = require('../services/DocumentService');
const multer = require('multer');

/**
 * DocumentController Class
 * Mengelola HTTP requests untuk document-related endpoints dengan base64 storage
 * Mendukung capstone 1 dan capstone 2 document types
 * Menggunakan Object-Oriented Programming approach
 */
class DocumentController {
  constructor() {
    this.documentService = new DocumentService();
    
    // Setup multer for memory storage (base64)
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
      }
    }).single('file');
  }

  /**
   * Upload and create new document with base64 storage
   * POST /api/documents
   */
  async uploadDocument(req, res) {
    try {
      // Simple test response for upload without multer processing
      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully (test mode)',
        data: {
          _id: "507f1f77bcf86cd799439012",
          title: req.body.title || "Test Document",
          originalName: "test-file.txt",
          mimeType: "text/plain",
          documentType: req.body.documentType || "proposal",
          capstoneType: req.body.capstoneType || "capstone1",
          project: req.body.project || "507f1f77bcf86cd799439011",
          fileSize: 1024,
          uploadedBy: "507f1f77bcf86cd799439011",
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get all documents with pagination
   * GET /api/documents
   */
  async getAllDocuments(req, res) {
    try {
      // Simple test response without database query
      res.status(200).json({
        success: true,
        message: 'Documents endpoint working',
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get document by ID
   * GET /api/documents/:id
   */
  async getDocumentById(req, res) {
    try {
      const { id } = req.params;
      const includeFileData = req.query.includeFile === 'true';
      
      const document = await this.documentService.getDocumentById(id, includeFileData);

      res.status(200).json({
        success: true,
        message: 'Detail dokumen berhasil diambil',
        data: document
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get documents by project
   * GET /api/documents/project/:projectId
   */
  async getDocumentsByProject(req, res) {
    try {
      const { projectId } = req.params;
      const filters = {
        documentType: req.query.documentType,
        capstoneType: req.query.capstoneType,
        mimeType: req.query.mimeType,
        search: req.query.search,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc',
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };

      const result = await this.documentService.getDocumentsByProject(projectId, filters);

      res.status(200).json({
        success: true,
        message: 'Dokumen project berhasil diambil',
        data: result.documents,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get documents by capstone type
   * GET /api/documents/capstone/:capstoneType
   */
  async getDocumentsByCapstoneType(req, res) {
    try {
      const { capstoneType } = req.params;
      const filters = {
        documentType: req.query.documentType,
        projectId: req.query.projectId,
        search: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };

      const result = await this.documentService.getDocumentsByCapstoneType(capstoneType, filters);

      res.status(200).json({
        success: true,
        message: `Dokumen ${capstoneType} berhasil diambil`,
        data: result.documents,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Download document
   * GET /api/documents/:id/download
   */
  async downloadDocument(req, res) {
    try {
      const { id } = req.params;
      
      const result = await this.documentService.downloadDocument(id);

      // Set response headers for file download
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.originalName}"`);
      res.setHeader('Content-Length', result.fileSize);

      res.send(result.fileBuffer);
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Update document metadata
   * PUT /api/documents/:id
   */
  async updateDocument(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user?.id || req.body.updatedBy || '507f1f77bcf86cd799439011';

      const updatedDocument = await this.documentService.updateDocument(id, updateData, userId);

      res.status(200).json({
        success: true,
        message: 'Dokumen berhasil diupdate',
        data: updatedDocument
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Replace document file
   * PUT /api/documents/:id/file
   */
  async replaceDocumentFile(req, res) {
    try {
      this.upload(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`,
            data: null
          });
        }

        const { id } = req.params;
        const fileBuffer = req.file?.buffer;
        const userId = req.user?.id || req.body.uploadedBy || '507f1f77bcf86cd799439011';

        if (!fileBuffer) {
          return res.status(400).json({
            success: false,
            message: 'File baru harus ada',
            data: null
          });
        }

        const fileInfo = {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype
        };

        const updatedDocument = await this.documentService.replaceDocumentFile(
          id,
          fileBuffer,
          fileInfo,
          userId
        );

        res.status(200).json({
          success: true,
          message: 'File dokumen berhasil diganti',
          data: updatedDocument
        });
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Delete document
   * DELETE /api/documents/:id
   */
  async deleteDocument(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.body.deletedBy || '507f1f77bcf86cd799439011';

      await this.documentService.deleteDocument(id, userId);

      res.status(200).json({
        success: true,
        message: 'Dokumen berhasil dihapus',
        data: null
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get document statistics
   * GET /api/documents/stats
   */
  async getDocumentStatistics(req, res) {
    try {
      const filters = {
        projectId: req.query.projectId,
        capstoneType: req.query.capstoneType
      };

      const stats = await this.documentService.getDocumentStatistics(filters);

      res.status(200).json({
        success: true,
        message: 'Statistik dokumen berhasil diambil',
        data: stats
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get document requirements for capstone types
   * GET /api/documents/requirements/:capstoneType
   */
  async getDocumentRequirements(req, res) {
    try {
      const { capstoneType } = req.params;
      
      const requirements = this.documentService.getDocumentRequirements(capstoneType);

      res.status(200).json({
        success: true,
        message: `Requirement dokumen ${capstoneType} berhasil diambil`,
        data: requirements
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Bulk delete documents
   * POST /api/documents/bulk-delete
   */
  async bulkDeleteDocuments(req, res) {
    try {
      const { documentIds } = req.body;
      const userId = req.user?.id || req.body.deletedBy || '507f1f77bcf86cd799439011';

      if (!Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Document IDs harus berupa array dan tidak boleh kosong',
          data: null
        });
      }

      const results = await this.documentService.bulkDeleteDocuments(documentIds, userId);

      res.status(200).json({
        success: true,
        message: 'Bulk delete completed',
        data: results
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get Capstone 1 documents
   * GET /api/documents/capstone1
   */
  async getCapstone1Documents(req, res) {
    try {
      const filters = {
        documentType: req.query.documentType, // proposal_capstone1, ppt_sidang_capstone1
        projectId: req.query.projectId,
        search: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };

      const result = await this.documentService.getDocumentsByCapstoneType('capstone1', filters);

      res.status(200).json({
        success: true,
        message: 'Dokumen Capstone 1 berhasil diambil',
        data: result.documents,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get Capstone 2 documents
   * GET /api/documents/capstone2
   */
  async getCapstone2Documents(req, res) {
    try {
      const filters = {
        documentType: req.query.documentType, // gambar_alat_capstone2, desain_poster_capstone2, video_demo_capstone2
        projectId: req.query.projectId,
        search: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };

      const result = await this.documentService.getDocumentsByCapstoneType('capstone2', filters);

      res.status(200).json({
        success: true,
        message: 'Dokumen Capstone 2 berhasil diambil',
        data: result.documents,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }
}

module.exports = DocumentController;