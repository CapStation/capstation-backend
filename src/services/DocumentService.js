const Document = require('../models/Document');
const Project = require('../models/Project');
const User = require('../models/userModel'); // Use real auth system
const Base64FileService = require('./Base64FileService');
const GridFSService = require('./GridFSService'); // Add GridFS for large files

/**
 * DocumentService Class  
 * Mengelola operasi CRUD untuk dokumen capstone dengan base64 storage
 * capstone 1 (proposal, PPT) dan capstone 2 (gambar alat, poster, video)
 */
class DocumentService {
  constructor() {
    this.model = Document;
    this.base64Service = new Base64FileService();
    this.gridfsService = new GridFSService(); // Add GridFS service
  }

  /**
   * Get all documents with pagination and filtering
   * @param {Object} filters - Filter options page, limit, search, etc.
   * @param {String} userId - Current user ID for access control
   * @returns {Promise<Object>} Documents with pagination info
   */
  async getAllDocuments(filters = {}, userId = null) {
    try {
      const { page = 1, limit = 10, search, documentType, capstoneCategory, mimeType, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
      const skip = (page - 1) * limit;
      
      // build query object - show active documents that are public OR owned by user
      const query = { 
        isActive: true,
        $or: [
          { isPublic: true },  // Public documents
          ...(userId ? [{ uploadedBy: userId }] : [])  // User's own documents if authenticated
        ]
      };
      
      // add search filter
      if (search) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { originalName: { $regex: search, $options: 'i' } }
          ]
        });
      }
      
      // add specific filters
      if (documentType) query.documentType = documentType;
      if (capstoneCategory) query.capstoneCategory = capstoneCategory;
      if (mimeType) query.mimeType = mimeType;
      
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      
      const [documents, total] = await Promise.all([
        this.model.find(query)
          .populate('project', 'title tema status academicYear')
          .select('-fileData') // Exclude fileData for performance
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        this.model.countDocuments(query)
      ]);

      const pagination = {
        currentPage: page,
        limit,
        totalDocuments: total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      };

      return {
        documents,
        pagination
      };
    } catch (error) {
      throw new Error(`Failed to get documents: ${error.message}`);
    }
  }

  /**
   * Get documents by filters with pagination
   * @param {Object} filters - Kriteria filter
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Documents with pagination info
   */
  async getDocumentsByFilters(filters = {}, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;
      
      // Only show active documents
      const query = { isActive: true };
      
      // Add filters
      if (filters.capstoneCategory) query.capstoneCategory = filters.capstoneCategory;
      if (filters.documentType) query.documentType = filters.documentType;
      if (filters.project) query.project = filters.project;
      if (filters.mimeType) query.mimeType = filters.mimeType;
      if (filters.search) {
        query.$or = [
          { title: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { originalName: { $regex: filters.search, $options: 'i' } }
        ];
      }
      
      const sort = {};
      sort[filters.sortBy || 'createdAt'] = filters.sortOrder === 'asc' ? 1 : -1;
      
      
      const [documents, total] = await Promise.all([
        this.model.find(query)
          .populate('project', 'title tema category')
          .select('-fileData') 
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        this.model.countDocuments(query)
      ]);

      const pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      };

      return {
        documents,
        pagination
      };
    } catch (error) {
      throw new Error(`Failed to filter documents: ${error.message}`);
    }
  }

  /**
   * Upload dan buat dokumen baru dengan base64 storage
   * @param {Object} documentData - Data dokumen
   * @param {Buffer} fileBuffer - File buffer
   * @param {String} userId - ID user yang upload
   * @returns {Promise<Object>} Dokumen yang telah dibuat
   */
  async createDocument(documentData, fileBuffer, userId) {
    try {
      const {
        title,
        description,
        originalName,
        mimeType,
        documentType,
        capstoneType,
        project: projectId
      } = documentData;

      // Validasi user (skipped for testing)
      // const user = await User.findById(userId);
      // if (!user) {
      //   throw new Error('User tidak ditemukan');
      // }

      // Validasi project
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project tidak ditemukan');
      }

      // Process file - check if it should use GridFS for large files
      const fileSize = fileBuffer.length;
      const shouldUseGridFS = this.gridfsService.shouldUseGridFS(fileSize);

      let fileData = null;
      let gridfsFileId = null;
      let fileHash = null;

      if (shouldUseGridFS) {
        console.log(`📦 Large file detected (${fileSize} bytes), using GridFS storage`);
        
        // Store in GridFS
        gridfsFileId = await this.gridfsService.storeFile(fileBuffer, {
          originalName,
          mimeType,
          documentType,
          capstoneCategory: capstoneType
        });

        // Generate hash for integrity
        fileHash = require('crypto').createHash('sha256').update(fileBuffer).digest('hex');
        
        console.log(`✅ File stored in GridFS with ID: ${gridfsFileId}`);
      } else {
        console.log(`📄 Small file (${fileSize} bytes), using base64 storage`);
        
        // Process with base64 service for small files
        const processedFile = await this.base64Service.processFileForUpload(fileBuffer, {
          originalName,
          mimeType,
          documentType
        });

        fileData = processedFile.base64Data;
        fileHash = processedFile.fileHash;
      }

      // Create document
      const newDocument = new this.model({
        title,
        description,
        originalName,
        fileSize,
        mimeType,
        fileExtension: require('path').extname(originalName).toLowerCase(),
        fileData, // null if stored in GridFS
        gridfsFileId, // null if stored as base64
        fileHash,
        documentType,
        capstoneCategory: capstoneType, 
        project: projectId,
        uploadedBy: userId
      });

      const savedDocument = await newDocument.save();

      // Update project documents array
      await Project.findByIdAndUpdate(projectId, {
        $push: { documents: savedDocument._id }
      });

      return await this.getDocumentById(savedDocument._id);
    } catch (error) {
      throw new Error(`Gagal membuat dokumen: ${error.message}`);
    }
  }

  /**
   * Mendapatkan dokumen berdasarkan ID
   * @param {String} documentId - ID dokumen
   * @param {Boolean} includeFileData - Include base64 file data
   * @returns {Promise<Object>} Detail dokumen
   */
  async getDocumentById(documentId, includeFileData = false) {
    try {
      let projection = {};
      
      // Exclude fileData by default for performance, but always include gridfsFileId
      if (!includeFileData) {
        projection = { fileData: 0 };
      }

      console.log('🔍 Getting document with includeFileData:', includeFileData);
      console.log('🔍 Document ID:', documentId);

      const document = await this.model
        .findById(documentId, projection)
        .populate('project', 'title capstoneType category')
        .populate('uploadedBy', 'firstName lastName email')
        .lean(); // Use lean for better performance with large data

      if (!document) {
        throw new Error('Dokumen tidak ditemukan');
      }

      if (includeFileData) {
        console.log('📊 MongoDB query result:');
        console.log('- Document has fileData:', !!document.fileData);
        console.log('- Document has gridfsFileId:', !!document.gridfsFileId);
        
        if (document.fileData) {
          console.log('- FileData type:', typeof document.fileData);
          console.log('- FileData length:', document.fileData.length);
          console.log('- FileData first 100 chars:', document.fileData.substring(0, 100));
          
          // Check if fileData contains valid base64
          const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
          const isValidBase64 = base64Regex.test(document.fileData);
          console.log('- Is valid Base64 format:', isValidBase64);
          
          if (!isValidBase64) {
            console.log('❌ FileData is not valid Base64 format!');
            console.log('- Sample chars that failed:', document.fileData.substring(0, 200));
          }
        }
        
        if (document.gridfsFileId) {
          console.log('- GridFS File ID:', document.gridfsFileId);
        }
      }

      return document;
    } catch (error) {
      console.log('💥 DocumentService getById error:', error.message);
      throw new Error(`Gagal mengambil detail dokumen: ${error.message}`);
    }
  }

  /**
   * Mendapatkan dokumen berdasarkan project
   * @param {String} projectId - ID project
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} List dokumen dengan pagination
   */
  async getDocumentsByProject(projectId, filters = {}) {
    try {
      const {
        documentType,
        capstoneType,
        mimeType,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = filters;

      // Validasi project
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project tidak ditemukan');
      }

      // Build query
      const query = { 
        project: projectId, 
        isActive: true 
      };

      if (documentType) {
        query.documentType = documentType;
      }

      if (capstoneType) {
        query.capstoneType = capstoneType;
      }

      if (mimeType) {
        query.mimeType = mimeType;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // Pagination
      const skip = (page - 1) * limit;
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query (exclude fileData for performance)
      const documents = await this.model
        .find(query, { fileData: 0 })
        .populate('uploadedBy', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      // Count total
      const total = await this.model.countDocuments(query);
      const totalPages = Math.ceil(total / limit);

      return {
        documents,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalDocuments: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Gagal mengambil dokumen project: ${error.message}`);
    }
  }

  /**
   * Mendapatkan dokumen berdasarkan tipe capstone
   * @param {String} capstoneType - Tipe capstone (capstone1, capstone2)
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Documents dengan pagination
   */
  async getDocumentsByCapstoneType(capstoneType, filters = {}) {
    try {
      const validTypes = ['capstone1', 'capstone2'];

      if (!validTypes.includes(capstoneType)) {
        throw new Error('Tipe capstone tidak valid');
      }

      // Build query
      const query = { 
        capstoneType, 
        isActive: true 
      };

      const {
        documentType,
        projectId,
        search,
        page = 1,
        limit = 20
      } = filters;

      if (documentType) {
        query.documentType = documentType;
      }

      if (projectId) {
        query.project = projectId;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // Pagination
      const skip = (page - 1) * limit;

      const documents = await this.model
        .find(query, { fileData: 0 })
        .populate('project', 'title category')
        .populate('uploadedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await this.model.countDocuments(query);
      const totalPages = Math.ceil(total / limit);

      return {
        documents,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalDocuments: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Gagal mengambil dokumen berdasarkan tipe capstone: ${error.message}`);
    }
  }

  /**
   * Download dokumen (convert base64 to buffer)
   * @param {String} documentId - ID dokumen
   * @returns {Promise<Object>} File buffer dan info
   */
  async downloadDocument(documentId) {
    try {
      // Get document with file data
      const document = await this.getDocumentById(documentId, true);
      
      if (!document) {
        throw new Error('Dokumen tidak ditemukan');
      }

      console.log('🔍 Download Debug Info:');
      console.log('- Document ID:', documentId);
      console.log('- Original file size:', document.fileSize);
      console.log('- File hash:', document.fileHash);
      console.log('- Has GridFS ID:', !!document.gridfsFileId);
      console.log('- Has Base64 data:', !!document.fileData);

      let result;

      if (document.gridfsFileId) {
        // File is stored in GridFS
        console.log('📦 Retrieving file from GridFS:', document.gridfsFileId);
        
        const gridfsFile = await this.gridfsService.retrieveFile(document.gridfsFileId);
        
        result = {
          fileBuffer: gridfsFile.fileBuffer,
          originalName: document.originalName,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          fileExtension: document.fileExtension,
          downloadTimestamp: new Date().toISOString()
        };

        console.log('- Retrieved buffer size from GridFS:', result.fileBuffer.length);
      } else if (document.fileData) {
        // File is stored as base64
        console.log('📄 Retrieving file from base64 storage');
        console.log('- Base64 data length:', document.fileData.length);

        result = await this.base64Service.processFileForDownload(
          document.fileData,
          {
            originalName: document.originalName,
            mimeType: document.mimeType,
            fileExtension: document.fileExtension,
            expectedHash: document.fileHash
          }
        );

        console.log('- Converted buffer size:', result.fileBuffer.length);
      } else {
        throw new Error('File data not found - neither GridFS nor base64 data available');
      }

      console.log('- Expected vs Actual size match:', document.fileSize === result.fileBuffer.length);

      // Update download count
      await this.model.findByIdAndUpdate(documentId, {
        $inc: { downloadCount: 1 }
      });

      return {
        fileBuffer: result.fileBuffer,
        originalName: result.originalName,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        documentType: document.documentType
      };
    } catch (error) {
      throw new Error(`Gagal download dokumen: ${error.message}`);
    }
  }

  /**
   * Update dokumen (metadata only, not file)
   * @param {String} documentId - ID dokumen
   * @param {Object} updateData - Data yang akan diupdate
   * @param {String} userId - ID user yang update
   * @returns {Promise<Object>} Dokumen yang telah diupdate
   */
  async updateDocument(documentId, updateData, userId) {
    try {
      const document = await this.model.findById(documentId);
      if (!document) {
        throw new Error('Dokumen tidak ditemukan');
      }

      // Check permission (only uploader or admin can update)
      // Skip permission check if uploadedBy is null (for testing/seeded data)
      if (document.uploadedBy && document.uploadedBy.toString() !== userId) {
        // Check if user is admin
        const user = await User.findById(userId);
        if (!user || user.role !== 'admin') {
          throw new Error('Tidak memiliki izin untuk mengupdate dokumen ini');
        }
        console.log('✅ Admin access granted for document update');
      }

      // Only allow updating metadata (add isPublic for admin control)
      const allowedFields = ['title', 'description', 'tags', 'isPublic'];
      const updateObject = {};
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updateObject[field] = updateData[field];
        }
      });

      if (Object.keys(updateObject).length === 0) {
        throw new Error('Tidak ada field yang valid untuk diupdate');
      }

      const updatedDocument = await this.model.findByIdAndUpdate(
        documentId,
        updateObject,
        { new: true }
      ).populate('project', 'title tema category')
       .select('-fileData'); // Exclude file data for response

      return updatedDocument;
    } catch (error) {
      throw new Error(`Gagal mengupdate dokumen: ${error.message}`);
    }
  }

  /**
   * Replace file dokumen (upload file baru)
   * @param {String} documentId - ID dokumen
   * @param {Buffer} fileBuffer - File buffer baru
   * @param {Object} fileInfo - Info file baru
   * @param {String} userId - ID user
   * @returns {Promise<Object>} Dokumen yang telah diupdate
   */
  async replaceDocumentFile(documentId, fileBuffer, fileInfo, userId) {
    try {
      const document = await this.model.findById(documentId);
      if (!document) {
        throw new Error('Dokumen tidak ditemukan');
      }

      // Check permission
      if (document.uploadedBy.toString() !== userId) {
        const user = await User.findById(userId);
        if (!user || user.role !== 'admin') {
          throw new Error('Tidak memiliki izin untuk mengganti file dokumen ini');
        }
      }

      // Process new file
      const processedFile = await this.base64Service.processFileForUpload(fileBuffer, {
        originalName: fileInfo.originalName,
        mimeType: fileInfo.mimeType,
        documentType: document.documentType
      });

      // Update document with new file data
      const updatedDocument = await this.model.findByIdAndUpdate(
        documentId,
        {
          originalName: processedFile.originalName,
          fileSize: processedFile.fileSize,
          mimeType: processedFile.mimeType,
          fileExtension: processedFile.fileExtension,
          fileData: processedFile.base64Data,
          fileHash: processedFile.fileHash,
          downloadCount: 0 // Reset download count
        },
        { new: true }
      ).populate('project', 'title capstoneType category')
       .populate('uploadedBy', 'firstName lastName email');

      return updatedDocument;
    } catch (error) {
      throw new Error(`Gagal mengganti file dokumen: ${error.message}`);
    }
  }

  /**
   * Hapus dokumen
   * @param {String} documentId - ID dokumen
   * @param {String} userId - ID user yang hapus
   * @returns {Promise<Boolean>} Success status
   */
  async deleteDocument(documentId, userId) {
    try {
      const document = await this.model.findById(documentId);
      if (!document) {
        throw new Error('Dokumen tidak ditemukan');
      }

      // Check permission - skip permission check if uploadedBy is null (for testing/seeded data)
      if (document.uploadedBy && document.uploadedBy.toString() !== userId) {
        const user = await User.findById(userId);
        if (!user || user.role !== 'admin') {
          throw new Error('Tidak memiliki izin untuk menghapus dokumen ini');
        }
      }

      // Soft delete
      await this.model.findByIdAndUpdate(documentId, {
        isActive: false
      });

      // Remove from project documents array
      await Project.findByIdAndUpdate(document.project, {
        $pull: { documents: documentId }
      });

      return true;
    } catch (error) {
      throw new Error(`Gagal menghapus dokumen: ${error.message}`);
    }
  }

  /**
   * Mendapatkan statistik dokumen
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Document statistics
   */
  async getDocumentStatistics(filters = {}) {
    try {
      const { projectId, capstoneType } = filters;
      
      let matchStage = { isActive: true };
      
      if (projectId) {
        matchStage.project = projectId;
      }
      
      if (capstoneType) {
        matchStage.capstoneType = capstoneType;
      }

      const stats = await this.model.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalDocuments: { $sum: 1 },
            totalSize: { $sum: '$fileSize' },
            totalDownloads: { $sum: '$downloadCount' },
            avgFileSize: { $avg: '$fileSize' }
          }
        }
      ]);

      const typeStats = await this.model.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$documentType',
            count: { $sum: 1 },
            totalSize: { $sum: '$fileSize' }
          }
        }
      ]);

      const capstoneStats = await this.model.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$capstoneType',
            count: { $sum: 1 },
            totalSize: { $sum: '$fileSize' }
          }
        }
      ]);

      return {
        overall: stats[0] || {
          totalDocuments: 0,
          totalSize: 0,
          totalDownloads: 0,
          avgFileSize: 0
        },
        byDocumentType: typeStats,
        byCapstoneType: capstoneStats
      };
    } catch (error) {
      throw new Error(`Gagal mengambil statistik dokumen: ${error.message}`);
    }
  }

  /**
   * Get document requirements info
   * @param {String} capstoneType - Capstone type
   * @returns {Object} Requirements info
   */
  getDocumentRequirements(capstoneType) {
    const requirements = {
      capstone1: [
        {
          documentType: 'proposal_capstone1',
          name: 'Proposal Capstone 1',
          description: 'Dokumen proposal untuk Capstone 1',
          allowedTypes: ['PDF', 'DOC', 'DOCX'],
          maxSize: '10MB',
          required: true
        },
        {
          documentType: 'ppt_sidang_capstone1',
          name: 'Presentasi Sidang',
          description: 'Slide presentasi untuk sidang Capstone 1',
          allowedTypes: ['PPT', 'PPTX'],
          maxSize: '50MB',
          required: true
        }
      ],
      capstone2: [
        {
          documentType: 'gambar_alat_capstone2',
          name: 'Gambar Alat',
          description: 'Foto/gambar alat atau prototype Capstone 2',
          allowedTypes: ['JPG', 'JPEG', 'PNG', 'GIF'],
          maxSize: '5MB',
          required: true
        },
        {
          documentType: 'desain_poster_capstone2',
          name: 'Desain Poster',
          description: 'Desain poster untuk presentasi Capstone 2',
          allowedTypes: ['JPG', 'JPEG', 'PNG', 'PDF'],
          maxSize: '10MB',
          required: true
        },
        {
          documentType: 'video_demo_capstone2',
          name: 'Video Demo',
          description: 'Video demonstrasi alat/aplikasi Capstone 2',
          allowedTypes: ['MP4', 'AVI', 'MOV', 'WMV'],
          maxSize: '100MB',
          required: true
        }
      ]
    };

    return requirements[capstoneType] || [];
  }

  /**
   * Bulk delete documents
   * @param {Array} documentIds - Array of document IDs
   * @param {String} userId - ID user yang hapus
   * @returns {Promise<Object>} Delete result
   */
  async bulkDeleteDocuments(documentIds, userId) {
    try {
      const results = {
        success: [],
        failed: []
      };

      for (const docId of documentIds) {
        try {
          await this.deleteDocument(docId, userId);
          results.success.push(docId);
        } catch (error) {
          results.failed.push({
            documentId: docId,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Gagal bulk delete dokumen: ${error.message}`);
    }
  }

  /**
   * Get documents by project tema with filtering
   * @param {Object} filters - Filter options including tema, documentType, capstoneCategory
   * @param {Object} options - Pagination options (page, limit, sortBy, sortOrder)
   * @returns {Promise<Object>} Documents with pagination info
   */
  async getDocumentsByTema(filters = {}, options = {}) {
    try {
      const { tema, documentType, capstoneCategory } = filters;
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;

      // Build aggregation pipeline to join with Project collection
      const pipeline = [
        // Lookup project data to get tema
        {
          $lookup: {
            from: 'projects', // Collection name in MongoDB
            localField: 'project',
            foreignField: '_id',
            as: 'projectData'
          }
        },
        // Unwind project data
        {
          $unwind: {
            path: '$projectData',
            preserveNullAndEmptyArrays: false // Only documents with valid projects
          }
        },
        // Match tema
        {
          $match: {
            'projectData.tema': tema
          }
        }
      ];

      // Add additional filters
      const additionalMatches = {};
      if (documentType) additionalMatches.documentType = documentType;
      if (capstoneCategory) additionalMatches.capstoneCategory = capstoneCategory;

      if (Object.keys(additionalMatches).length > 0) {
        pipeline.push({
          $match: additionalMatches
        });
      }

      // Add project info to results
      pipeline.push({
        $addFields: {
          'tema': '$projectData.tema',
          'projectTitle': '$projectData.title',
          'projectDescription': '$projectData.description'
        }
      });

      pipeline.push({
        $project: {
          projectData: 0 
        }
      });

      // Sort
      const sortObject = {};
      sortObject[sortBy] = sortOrder === 'asc' ? 1 : -1;
      pipeline.push({ $sort: sortObject });

      // Get total count for pagination
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await this.model.aggregate(countPipeline);
      const totalDocuments = countResult.length > 0 ? countResult[0].total : 0;

      // Add pagination
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });

      // Execute aggregation
      const documents = await this.model.aggregate(pipeline);

      // Calculate pagination info
      const totalPages = Math.ceil(totalDocuments / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        documents,
        totalDocuments,
        pagination: {
          currentPage: page,
          totalPages,
          totalDocuments,
          hasNextPage,
          hasPrevPage,
          limit
        }
      };
    } catch (error) {
      throw new Error(`Failed to get documents by tema: ${error.message}`);
    }
  }

  /**
   * Get documents by capstone category with validation
   * @param {string} capstoneCategory - Capstone category (capstone1 or capstone2)
   * @param {Object} options - Pagination options (page, limit, sortBy, sortOrder)
   * @returns {Promise<Object>} Documents with pagination info
   */
  async getDocumentsByCapstoneCategory(capstoneCategory, options = {}) {
    try {
      // Validate capstone category
      const validCategories = ['capstone1', 'capstone2', 'general'];
      if (!validCategories.includes(capstoneCategory)) {
        throw new Error(`Invalid capstone category '${capstoneCategory}'. Valid categories are: ${validCategories.join(', ')}`);
      }

      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;

      // Build query
      const query = {
        capstoneCategory: capstoneCategory,
        isActive: true
      };

      // Build sort object
      const sortObject = {};
      sortObject[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Get documents and total count
      const [documents, totalDocuments] = await Promise.all([
        this.model.find(query)
          .populate('project', 'title tema status academicYear')
          .sort(sortObject)
          .skip(skip)
          .limit(limit)
          .lean(),
        this.model.countDocuments(query)
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(totalDocuments / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        documents,
        totalDocuments,
        pagination: {
          currentPage: page,
          totalPages,
          totalDocuments,
          hasNextPage,
          hasPrevPage,
          limit
        }
      };
    } catch (error) {
      throw new Error(`Failed to get documents by capstone category: ${error.message}`);
    }
  }

  /**
   * Get document statistics by tema
   * @param {string} tema - Project theme to filter by
   * @returns {Promise<Object>} Statistics for documents by tema
   */
  async getDocumentStatsByTema(tema) {
    try {
      const pipeline = [
        // Lookup project data to get tema
        {
          $lookup: {
            from: 'projects',
            localField: 'project', 
            foreignField: '_id',
            as: 'projectData'
          }
        },
        // Unwind project data
        {
          $unwind: {
            path: '$projectData',
            preserveNullAndEmptyArrays: false
          }
        },
        // Match tema and active documents
        {
          $match: {
            'projectData.tema': tema,
            isActive: true
          }
        },
        // Group and calculate basic statistics
        {
          $group: {
            _id: null,
            totalDocuments: { $sum: 1 },
            totalSize: { $sum: '$fileSize' },
            totalDownloads: { $sum: '$downloadCount' },
            documentTypes: { $addToSet: '$documentType' },
            capstoneCategories: { $addToSet: '$capstoneCategory' },
            mimeTypes: { $addToSet: '$mimeType' },
            averageFileSize: { $avg: '$fileSize' }
          }
        },
        // Format output
        {
          $project: {
            _id: 0,
            tema: tema,
            totalDocuments: 1,
            totalSize: 1,
            totalDownloads: 1,
            documentTypes: 1,
            capstoneCategories: 1,
            mimeTypes: 1,
            averageFileSize: { $round: ['$averageFileSize', 2] }
          }
        }
      ];

      // Separate aggregation for breakdown by type and category
      const breakdownPipeline = [
        {
          $lookup: {
            from: 'projects',
            localField: 'project', 
            foreignField: '_id',
            as: 'projectData'
          }
        },
        {
          $unwind: {
            path: '$projectData',
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            'projectData.tema': tema,
            isActive: true
          }
        },
        {
          $group: {
            _id: {
              type: '$documentType',
              category: '$capstoneCategory'
            },
            count: { $sum: 1 },
            downloads: { $sum: '$downloadCount' }
          }
        },
        {
          $project: {
            _id: 0,
            type: '$_id.type',
            category: '$_id.category',
            count: 1,
            downloads: 1
          }
        }
      ];

      const [stats, breakdown] = await Promise.all([
        Document.aggregate(pipeline),
        Document.aggregate(breakdownPipeline)
      ]);

      const result = stats[0] || {
        tema,
        totalDocuments: 0,
        totalSize: 0,
        totalDownloads: 0,
        documentTypes: [],
        capstoneCategories: [],
        mimeTypes: [],
        averageFileSize: 0
      };

      result.breakdown = breakdown || [];

      return result;
    } catch (error) {
      throw new Error(`Failed to get document statistics by tema: ${error.message}`);
    }
  }
}

module.exports = DocumentService;