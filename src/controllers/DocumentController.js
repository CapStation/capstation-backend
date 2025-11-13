const DocumentService = require('../services/DocumentService');
const multer = require('multer');
const { getValidThemesDash, isValidTheme, convertToUnderscore } = require('../configs/themes');
const FileValidationManager = require('../utils/FileValidationManager');

class DocumentController {
  constructor() {
    this.documentService = new DocumentService();
    
    // Setup multer for memory storage (base64)
    const multerConfig = {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit per file
        files: 10 // Maksimal 10 files
      }
    };
    
    // Single file upload
    this.uploadSingle = multer(multerConfig).single('file');
    
    // Multiple files upload (up to 10)
    this.uploadMultiple = multer(multerConfig).array('file', 10);
  }

  /**
   * base64 storage upload and create (supports single or multiple files)
   * POST /api/documents
   */
  async uploadDocument(req, res) {
    try {
      // Check if files were uploaded via multer
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one file is required for upload',
          data: null
        });
      }

      console.log(`📁 ${req.files.length} file(s) received`);

      // Get user ID from auth middleware
      const userId = req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User tidak terautentikasi',
          data: null
        });
      }
      
      console.log('👤 Using authenticated userId:', userId);

      // Extract common metadata from request body
      const baseTitle = req.body.title;
      const description = req.body.description;
      const project = req.body.project;
      const documentType = req.body.documentType;
      const capstoneType = req.body.capstoneCategory;

      // Validasi data yang dibutuhkan
      if (!baseTitle || !project || !documentType || !capstoneType) {
        console.log('Missing required fields');
        return res.status(400).json({
          success: false,
          message: 'Required fields missing: title, project, documentType, capstoneCategory',
          data: null
        });
      }

      console.log('Field validation success');

      // Process each file
      const uploadedDocuments = [];
      const errors = [];

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        
        // Validate file type and size
        try {
          const validationResult = FileValidationManager.validateFile({
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            documentType: req.body.documentType
          });
          
          if (!validationResult.isValid) {
            errors.push({
              file: file.originalname,
              error: validationResult.error
            });
            continue; // Skip this file
          }
        } catch (validationError) {
          errors.push({
            file: file.originalname,
            error: validationError.message
          });
          continue; // Skip this file
        }
        
        // Generate title with number suffix if multiple files
        const title = req.files.length > 1 ? `${baseTitle} (${i + 1})` : baseTitle;

        try {
          console.log(`Processing file ${i + 1}/${req.files.length}:`, {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            title: title
          });

          const documentData = {
            title: title,
            description: description,
            project: project,
            documentType: documentType,
            capstoneType: capstoneType,
            originalName: file.originalname,
            mimeType: file.mimetype
          };

          // Create document via service with file buffer
          const document = await this.documentService.createDocument(documentData, file.buffer, userId);
          
          uploadedDocuments.push({
            _id: document._id,
            title: document.title,
            description: document.description,
            originalName: document.originalName,
            mimeType: document.mimeType,
            documentType: document.documentType,
            capstoneType: document.capstoneType,
            project: document.project,
            fileSize: document.fileSize,
            uploadedBy: document.uploadedBy,
            createdAt: document.createdAt,
            updatedAt: document.updatedAt
          });

          console.log(`Document ${i + 1} created successfully:`, document._id);
        } catch (error) {
          console.error(`❌ Error uploading file ${i + 1}:`, error.message);
          errors.push({
            file: file.originalname,
            title: title,
            error: error.message
          });
        }
      }

      // Return response
      if (uploadedDocuments.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'All file uploads failed',
          data: null,
          errors: errors
        });
      }

      res.status(201).json({
        success: true,
        message: `${uploadedDocuments.length} document(s) uploaded successfully`,
        data: uploadedDocuments,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          total: req.files.length,
          successful: uploadedDocuments.length,
          failed: errors.length
        }
      });
    } catch (error) {
      console.error('Upload Document Error:', error);
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
      const { formatDocumentsForResponse } = require('../utils/responseFormatter');
      
      // Get authenticated user ID for access control
      const userId = req.user?._id;
      
      const filters = {
        documentType: req.query.documentType,
        capstoneCategory: req.query.capstoneCategory, // Fix: use capstoneCategory instead of capstoneType
        mimeType: req.query.mimeType,
        search: req.query.search,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc',
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      };

      const result = await this.documentService.getAllDocuments(filters, userId);

      // Format documents to remove/shorten fileData
      const formattedDocuments = formatDocumentsForResponse(result.documents);

      res.status(200).json({
        success: true,
        message: 'All documents retrieved successfully',
        data: {
          documents: formattedDocuments,
          pagination: {
            page: result.pagination.currentPage,
            limit: result.pagination.limit,
            total: result.pagination.totalDocuments,
            pages: result.pagination.totalPages,
            hasNext: result.pagination.hasNextPage,
            hasPrev: result.pagination.hasPrevPage
          }
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
   * Get documents by capstone type (capstone1, capstone2, general)
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
   * Debug endpoint buat cek file data length
   * GET /api/documents/:id/debug
   */
  async debugDocument(req, res) {
    try {
      const { id } = req.params;
      
      // Get document with file data
      const document = await this.documentService.getDocumentById(id, true);
      
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
          data: null
        });
      }

      const debugInfo = {
        documentId: id,
        originalName: document.originalName,
        expectedFileSize: document.fileSize,
        mimeType: document.mimeType,
        base64DataExists: !!document.fileData,
        base64DataLength: document.fileData ? document.fileData.length : 0,
        expectedBase64Length: Math.ceil(document.fileSize * 4 / 3), // Rough base64 calculation
        fileHash: document.fileHash,
        compressionLevel: document.compressionLevel,
        fileExtension: document.fileExtension,
        base64Sample: {
          first200: document.fileData ? document.fileData.substring(0, 200) : null,
          last200: document.fileData ? document.fileData.substring(document.fileData.length - 200) : null,
          containsInvalidChars: document.fileData ? !/^[A-Za-z0-9+/]*={0,2}$/.test(document.fileData) : null
        }
      };

      res.status(200).json({
        success: true,
        message: 'Debug information retrieved',
        data: debugInfo
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
      const { info } = req.query; 
      
      const result = await this.documentService.downloadDocument(id);

      console.log('📁 Controller download result:');
      console.log('- File buffer length:', result.fileBuffer.length);
      console.log('- Original name:', result.originalName);
      console.log('- MIME type:', result.mimeType);
      console.log('- Expected file size:', result.fileSize);

      // If info=true, return JSON response instead of binary buat postman soalnya error
      if (info === 'true') {
        return res.status(200).json({
          success: true,
          message: 'Document ready for download',
          data: {
            _id: id,
            originalName: result.originalName,
            mimeType: result.mimeType,
            fileSize: result.fileSize,
            documentType: result.documentType,
            downloadUrl: `/api/documents/${id}/download`,
            fileSizeFormatted: `${(result.fileSize / 1024).toFixed(2)} KB`,
            actualBufferSize: result.fileBuffer.length
          }
        });
      }

      // Set response headers for file download
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.originalName}"`);
      res.setHeader('Content-Length', result.fileBuffer.length); // Use actual buffer length
      res.setHeader('Cache-Control', 'private, no-cache');

      console.log('Sending buffer with length:', result.fileBuffer.length);
      res.send(result.fileBuffer);
    } catch (error) {
      console.error('Download Error:', error);
      res.status(404).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Preview document in browser (inline)
   * GET /api/documents/:id/preview
   */
  async previewDocument(req, res) {
    try {
      const { id } = req.params;
      
      console.log('👁️ Preview request received for document:', id);
      console.log('📋 Request headers:', {
        authorization: req.headers.authorization ? 'Present' : 'Missing',
        'x-user-id': req.headers['x-user-id'],
        origin: req.headers.origin
      });
      
      const result = await this.documentService.downloadDocument(id);

      console.log('👁️ Controller preview result:');
      console.log('- File buffer length:', result.fileBuffer.length);
      console.log('- Original name:', result.originalName);
      console.log('- MIME type:', result.mimeType);

      // Set response headers for inline preview
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${result.originalName}"`);
      res.setHeader('Content-Length', result.fileBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour for preview
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:3000');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      console.log('✅ Sending preview buffer with length:', result.fileBuffer.length);
      res.send(result.fileBuffer);
    } catch (error) {
      console.error('❌ Preview Error:', error);
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
      const userId = req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User tidak terautentikasi',
          data: null
        });
      }

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
        const userId = req.user?._id;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'User tidak terautentikasi',
            data: null
          });
        }

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
      const userId = req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User tidak terautentikasi',
          data: null
        });
      }

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
      const userId = req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User tidak terautentikasi',
          data: null
        });
      }

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

  /**
   * Get documents by capstone category
   * GET /api/documents/category/:capstoneCategory
   */
  async getDocumentsByCapstoneCategory(req, res) {
    try {
      const { capstoneCategory } = req.params;
      const { page = 1, limit = 10, projectId, documentType } = req.query;

      const filters = { capstoneCategory };
      if (projectId) filters.project = projectId;
      if (documentType) filters.documentType = documentType;

      const result = await this.documentService.getDocumentsByFilters(filters, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.status(200).json({
        success: true,
        message: `Documents with category '${capstoneCategory}' retrieved successfully`,
        data: result.documents,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to get documents by category',
        error: error.message
      });
    }
  }

  /**
   * Get project documents by capstone category
   * GET /api/documents/project/:projectId/category/:capstoneCategory
   */
  async getProjectDocumentsByCategory(req, res) {
    try {
      const { projectId, capstoneCategory } = req.params;
      const { page = 1, limit = 10, documentType } = req.query;

      const filters = { 
        project: projectId, 
        capstoneCategory 
      };
      if (documentType) filters.documentType = documentType;

      const result = await this.documentService.getDocumentsByFilters(filters, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.status(200).json({
        success: true,
        message: `Project documents with category '${capstoneCategory}' retrieved successfully`,
        data: result.documents,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to get project documents by category',
        error: error.message
      });
    }
  }

  /**
   * Get documents by project theme
   * GET /api/documents/tema/:tema
   * Query params: documentType, capstoneCategory, page, limit
   */
  async getDocumentsByTema(req, res) {
    try {
      const { tema } = req.params;
      const { 
        documentType, 
        capstoneCategory, 
        page = 1, 
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // validasi tema
      const validTemas = getValidThemesDash();
      if (!validTemas.includes(tema)) {
        return res.status(400).json({
          success: false,
          message: `Invalid tema. Valid themes are: ${validTemas.join(', ')}`,
          data: null
        });
      }

      const filters = { tema };
      if (documentType) filters.documentType = documentType;
      if (capstoneCategory) filters.capstoneCategory = capstoneCategory;

      const result = await this.documentService.getDocumentsByTema(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      });

      res.status(200).json({
        success: true,
        message: `Documents for tema '${tema}' retrieved successfully`,
        data: {
          tema,
          totalDocuments: result.totalDocuments,
          documents: result.documents,
          filters: {
            documentType: documentType || 'all',
            capstoneCategory: capstoneCategory || 'all'
          }
        },
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get Documents by Tema Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get documents by tema',
        error: error.message,
        data: null
      });
    }
  }

  /**
   * Get document statistics by tema
   * GET /api/documents/tema/:tema/stats
   */
  async getDocumentStatsByTema(req, res) {
    try {
      const { tema } = req.params;

      // validasi tema
      const validTemas = getValidThemesDash();
      if (!validTemas.includes(tema)) {
        return res.status(400).json({
          success: false,
          message: `Invalid tema. Valid themes are: ${validTemas.join(', ')}`,
          data: null
        });
      }

      const stats = await this.documentService.getDocumentStatsByTema(tema);

      res.status(200).json({
        success: true,
        message: `Document statistics for tema '${tema}' retrieved successfully`,
        data: {
          tema,
          ...stats
        }
      });
    } catch (error) {
      console.error('Get Document Stats by Tema Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get document statistics by tema',
        error: error.message,
        data: null
      });
    }
  }

  /**
   * Get documents by project tema with formatting
   * GET /api/documents/tema/:tema
   */
  async getDocumentsByTema(req, res) {
    try {
      const { tema } = req.params;
      const { formatDocumentsForResponse } = require('../utils/responseFormatter');
      
      // Validate tema
      const { isValidTheme } = require('../configs/themes');
      if (!isValidTheme(tema)) {
        return res.status(400).json({
          success: false,
          message: `Invalid tema '${tema}'. Valid themes are: ${Object.keys(require('../configs/themes').getValidThemesDash()).join(', ')}`,
          data: null
        });
      }

      const filters = {
        tema: tema,
        documentType: req.query.documentType,
        capstoneCategory: req.query.capstoneCategory
      };

      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await this.documentService.getDocumentsByTema(filters, options);

      // Format documents to remove/shorten fileData
      const formattedDocuments = formatDocumentsForResponse(result.documents);

      res.status(200).json({
        success: true,
        message: `Documents with tema '${tema}' retrieved successfully`,
        data: {
          documents: formattedDocuments,
          pagination: {
            page: result.pagination.currentPage,
            limit: result.pagination.limit,
            total: result.pagination.totalDocuments,
            pages: result.pagination.totalPages,
            hasNext: result.pagination.hasNextPage,
            hasPrev: result.pagination.hasPrevPage
          }
        }
      });
    } catch (error) {
      console.error('Get Documents by Tema Error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get documents by capstone category with validation and formatting
   * GET /api/documents/category/:capstoneCategory
   */
  async getDocumentsByCapstoneCategory(req, res) {
    try {
      const { capstoneCategory } = req.params;
      const { formatDocumentsForResponse } = require('../utils/responseFormatter');

      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await this.documentService.getDocumentsByCapstoneCategory(capstoneCategory, options);

      // Format documents to remove/shorten fileData
      const formattedDocuments = formatDocumentsForResponse(result.documents);

      res.status(200).json({
        success: true,
        message: `Documents with category '${capstoneCategory}' retrieved successfully`,
        data: {
          documents: formattedDocuments,
          pagination: {
            page: result.pagination.currentPage,
            limit: result.pagination.limit,
            total: result.pagination.totalDocuments,
            pages: result.pagination.totalPages,
            hasNext: result.pagination.hasNextPage,
            hasPrev: result.pagination.hasPrevPage
          }
        }
      });
    } catch (error) {
      console.error('Get Documents by Capstone Category Error:', error);
      
      // Check if it's a validation error for invalid category
      if (error.message.includes('Invalid capstone category')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          data: null
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get documents by capstone category',
        error: error.message,
        data: null
      });
    }
  }

  /**
   * Get document categories (helper method)
   * GET /api/documents/categories
   */
  async getDocumentCategories(req, res) {
    try {
      const { getValidThemesDash } = require('../configs/themes');
      
      const categories = {
        capstoneCategories: ['capstone1', 'capstone2', 'general'],
        documentTypes: {
          capstone1: ['proposal', 'laporan', 'ppt'],
          capstone2: ['poster', 'video_demo', 'laporan_akhir', 'gambar_alat'],
          general: ['dokumentasi', 'lainnya']
        },
        themes: getValidThemesDash() // Langsung gunakan array, bukan Object.keys()
      };

      res.status(200).json({
        success: true,
        message: 'Document categories retrieved successfully',
        data: categories
      });
    } catch (error) {
      console.error('Get Document Categories Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get document categories',
        error: error.message,
        data: null
      });
    }
  }

  /**
   * Get documents statistics
   * GET /api/documents/stats
   */
  async getDocumentStatistics(req, res) {
    try {
      // This would be implemented based on your requirements
      res.status(200).json({
        success: true,
        message: 'Document statistics retrieved successfully',
        data: {
          message: 'Statistics endpoint not yet implemented'
        }
      });
    } catch (error) {
      console.error('Get Document Statistics Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get document statistics',
        error: error.message,
        data: null
      });
    }
  }

  /**
   * Get project documents by category
   * GET /api/documents/project/:projectId/category/:capstoneCategory
   */
  async getProjectDocumentsByCategory(req, res) {
    try {
      const { projectId, capstoneCategory } = req.params;
      const { formatDocumentsForResponse } = require('../utils/responseFormatter');

      // Validate capstone category
      const validCategories = ['capstone1', 'capstone2'];
      if (!validCategories.includes(capstoneCategory)) {
        return res.status(400).json({
          success: false,
          message: `Invalid capstone category '${capstoneCategory}'. Valid categories are: ${validCategories.join(', ')}`,
          data: null
        });
      }

      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      // Get documents for specific project and category
      const documents = await this.documentService.getDocumentsByProject(projectId, {
        capstoneCategory: capstoneCategory,
        ...options
      });

      // Format documents to remove/shorten fileData
      const formattedDocuments = formatDocumentsForResponse(documents.documents);

      res.status(200).json({
        success: true,
        message: `Documents for project '${projectId}' with category '${capstoneCategory}' retrieved successfully`,
        data: {
          documents: formattedDocuments,
          pagination: documents.pagination
        }
      });
    } catch (error) {
      console.error('Get Project Documents by Category Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get project documents by category',
        error: error.message,
        data: null
      });
    }
  }
}

module.exports = DocumentController;