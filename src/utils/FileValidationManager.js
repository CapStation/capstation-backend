class FileValidationManager {
  constructor() {
    this.fileConfig = {
      mimeTypes: {
        // Documents
        'application/pdf': { category: 'document', extension: '.pdf' },
        'application/msword': { category: 'document', extension: '.doc' },
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { category: 'document', extension: '.docx' },
        
        // Presentations
        'application/vnd.ms-powerpoint': { category: 'presentation', extension: '.ppt' },
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': { category: 'presentation', extension: '.pptx' },
        
        // Spreadsheets
        'application/vnd.ms-excel': { category: 'spreadsheet', extension: '.xls' },
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { category: 'spreadsheet', extension: '.xlsx' },
        
        // Text
        'text/plain': { category: 'text', extension: '.txt' },
        
        // Images
        'image/jpeg': { category: 'image', extension: '.jpg' },
        'image/jpg': { category: 'image', extension: '.jpg' },
        'image/png': { category: 'image', extension: '.png' },
        'image/gif': { category: 'image', extension: '.gif' },
        'image/webp': { category: 'image', extension: '.webp' },
        
        // Videos
        'video/mp4': { category: 'video', extension: '.mp4' },
        'video/avi': { category: 'video', extension: '.avi' },
        'video/mov': { category: 'video', extension: '.mov' },
        'video/wmv': { category: 'video', extension: '.wmv' },
        'video/webm': { category: 'video', extension: '.webm' },
        'video/quicktime': { category: 'video', extension: '.mov' },
        
        // Archives
        'application/zip': { category: 'archive', extension: '.zip' },
        'application/x-rar-compressed': { category: 'archive', extension: '.rar' }
      },

      // Size limits
      sizeLimits: {
        document: 20 * 1024 * 1024,     // 20MB
        presentation: 20 * 1024 * 1024,  
        spreadsheet: 20 * 1024 * 1024,  
        text: 20 * 1024 * 1024,         
        image: 20 * 1024 * 1024,         
        video: 100 * 1024 * 1024,        // 100MB
        archive: 20 * 1024 * 1024,       
        default: 20 * 1024 * 1024        
      },

      // Document type specific rules
      documentTypeRules: {
        'proposal_capstone1': {
          allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          maxSize: 20 * 1024 * 1024
        },
        'ppt_sidang_capstone1': {
          allowedMimeTypes: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
          maxSize: 20 * 1024 * 1024
        },
        'gambar_alat_capstone2': {
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
          maxSize: 20 * 1024 * 1024
        },
        'desain_poster_capstone2': {
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
          maxSize: 20 * 1024 * 1024
        },
        'video_demo_capstone2': {
          allowedMimeTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/quicktime'],
          maxSize: 100 * 1024 * 1024
        },
        'laporan': {
          allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          maxSize: 20 * 1024 * 1024
        },
        'dokumentasi': {
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
          maxSize: 20 * 1024 * 1024
        },
        'lainnya': {
          allowedMimeTypes: ['*'], // all types
          maxSize: 20 * 1024 * 1024
        }
      },

      // extensions to block
      dangerousExtensions: [
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
        '.php', '.asp', '.jsp', '.sh', '.ps1', '.py', '.rb', '.pl'
      ]
    };
  }

  /**
   * Get all allowed MIME types
   * @returns {Array} Array of allowed MIME types
   */
  getAllowedMimeTypes() {
    return Object.keys(this.fileConfig.mimeTypes);
  }

  /**
   * Get all allowed extensions
   * @returns {Array} Array of allowed extensions
   */
  getAllowedExtensions() {
    return [...new Set(Object.values(this.fileConfig.mimeTypes).map(config => config.extension))];
  }

  /**
   * Get allowed MIME types for specific document type
   * @param {String} documentType - Document type
   * @returns {Array} Array of allowed MIME types
   */
  getAllowedMimeTypesForDocumentType(documentType) {
    const rules = this.fileConfig.documentTypeRules[documentType];
    return rules ? rules.allowedMimeTypes : this.getAllowedMimeTypes();
  }

  /**
   * Get file category from MIME type
   * @param {String} mimeType - MIME type
   * @returns {String} File category
   */
  getFileCategory(mimeType) {
    const config = this.fileConfig.mimeTypes[mimeType];
    return config ? config.category : 'unknown';
  }

  /**
   * Get size limit for file category
   * @param {String} category - File category
   * @returns {Number} Size limit in bytes
   */
  getSizeLimitForCategory(category) {
    return this.fileConfig.sizeLimits[category] || this.fileConfig.sizeLimits.default;
  }

  /**
   * Get size limit for document type
   * @param {String} documentType - Document type
   * @returns {Number} Size limit in bytes
   */
  getSizeLimitForDocumentType(documentType) {
    const rules = this.fileConfig.documentTypeRules[documentType];
    return rules ? rules.maxSize : this.fileConfig.sizeLimits.default;
  }

  /**
   * Validate MIME type
   * @param {String} mimeType - MIME type to validate
   * @param {String} documentType - Optional document type for specific validation
   * @returns {Object} Validation result
   */
  validateMimeType(mimeType, documentType = null) {
    // Check if MIME type is generally allowed
    if (!this.fileConfig.mimeTypes[mimeType]) {
      return {
        isValid: false,
        error: `MIME type '${mimeType}' tidak diizinkan`,
        allowedTypes: this.getAllowedMimeTypes()
      };
    }

    // Check document type specific rules
    if (documentType) {
      const allowedForDocType = this.getAllowedMimeTypesForDocumentType(documentType);
      if (!allowedForDocType.includes('*') && !allowedForDocType.includes(mimeType)) {
        return {
          isValid: false,
          error: `MIME type '${mimeType}' tidak diizinkan untuk document type '${documentType}'`,
          allowedTypes: allowedForDocType
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate file extension
   * @param {String} extension - File extension to validate
   * @param {String} mimeType - MIME type for consistency check
   * @returns {Object} Validation result
   */
  validateExtension(extension, mimeType = null) {
    const normalizedExt = extension.toLowerCase();

    // blokir extension berbahaya bro
    if (this.fileConfig.dangerousExtensions.includes(normalizedExt)) {
      return {
        isValid: false,
        error: `Ekstensi '${extension}' berpotensi berbahaya dan tidak diizinkan`
      };
    }

    // Check if extension is in allowed list
    if (!this.getAllowedExtensions().includes(normalizedExt)) {
      return {
        isValid: false,
        error: `Ekstensi '${extension}' tidak diizinkan`,
        allowedExtensions: this.getAllowedExtensions()
      };
    }

    // Check consistency with MIME type
    if (mimeType) {
      const config = this.fileConfig.mimeTypes[mimeType];
      if (config && config.extension !== normalizedExt) {
        return {
          isValid: false,
          error: `Ekstensi '${extension}' tidak sesuai dengan MIME type '${mimeType}'`,
          expectedExtension: config.extension
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate file size
   * @param {Number} fileSize - File size in bytes
   * @param {String} mimeType - MIME type for category-based validation
   * @param {String} documentType - Optional document type for specific validation
   * @returns {Object} Validation result
   */
  validateFileSize(fileSize, mimeType, documentType = null) {
    let maxSize;

    // Get size limit based on document type first, then category
    if (documentType) {
      maxSize = this.getSizeLimitForDocumentType(documentType);
    } else {
      const category = this.getFileCategory(mimeType);
      maxSize = this.getSizeLimitForCategory(category);
    }

    if (fileSize > maxSize) {
      return {
        isValid: false,
        error: `Ukuran file ${this.formatFileSize(fileSize)} melebihi batas maksimal ${this.formatFileSize(maxSize)}`,
        maxSize: maxSize,
        currentSize: fileSize
      };
    }

    return { isValid: true };
  }

  /**
   * Comprehensive file validation
   * @param {Object} fileInfo - File information
   * @returns {Object} Validation result
   */
  validateFile(fileInfo) {
    const { originalName, mimeType, size, documentType } = fileInfo;
    const extension = require('path').extname(originalName);

    // Validate MIME type
    const mimeValidation = this.validateMimeType(mimeType, documentType);
    if (!mimeValidation.isValid) {
      return mimeValidation;
    }

    // Validate extension
    const extValidation = this.validateExtension(extension, mimeType);
    if (!extValidation.isValid) {
      return extValidation;
    }

    // Validate file size
    const sizeValidation = this.validateFileSize(size, mimeType, documentType);
    if (!sizeValidation.isValid) {
      return sizeValidation;
    }

    return {
      isValid: true,
      message: 'File validation passed',
      fileInfo: {
        category: this.getFileCategory(mimeType),
        maxSize: documentType ? this.getSizeLimitForDocumentType(documentType) : this.getSizeLimitForCategory(this.getFileCategory(mimeType))
      }
    };
  }

  /**
   * Format file size for human readable output
   * @param {Number} bytes - Size in bytes
   * @returns {String} Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get multer file filter function
   * @returns {Function} Multer file filter function
   */
  getMulterFileFilter() {
    return (req, file, cb) => {
      console.log('🔍 FileValidationManager processing:', {
        originalname: file.originalname,
        mimetype: file.mimetype
      });

      const validation = this.validateFile({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: 0, 
        documentType: req.body.documentType
      });

      if (validation.isValid) {
        console.log('File filter passed');
        cb(null, true);
      } else {
        console.log('File filter rejected:', validation.error);
        cb(new Error(validation.error), false);
      }
    };
  }
}

// Export singleton instance
module.exports = new FileValidationManager();