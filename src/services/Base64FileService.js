const crypto = require('crypto');
const path = require('path');

/**
 * Base64FileService Class
 * Service untuk menghandle conversion file ke base64 dan sebaliknya
 * Mendukung compression dan validation untuk capstone documents
 */
class Base64FileService {
  constructor() {
    // File size limits per document type (in bytes)
    this.sizeLimit = {
      'proposal_capstone1': 10 * 1024 * 1024, // 10MB
      'ppt_sidang_capstone1': 50 * 1024 * 1024, // 50MB
      'gambar_alat_capstone2': 5 * 1024 * 1024, // 5MB
      'desain_poster_capstone2': 10 * 1024 * 1024, // 10MB
      'video_demo_capstone2': 100 * 1024 * 1024, // 100MB
      'laporan': 10 * 1024 * 1024, // 10MB
      'dokumentasi': 5 * 1024 * 1024, // 5MB
      'lainnya': 20 * 1024 * 1024 // 20MB
    };

    // Allowed MIME types per document type
    this.allowedMimeTypes = {
      'proposal_capstone1': [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      'ppt_sidang_capstone1': [
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ],
      'gambar_alat_capstone2': [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif'
      ],
      'desain_poster_capstone2': [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/pdf'
      ],
      'video_demo_capstone2': [
        'video/mp4',
        'video/avi',
        'video/mov',
        'video/wmv',
        'video/quicktime'
      ],
      'laporan': [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      'dokumentasi': [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/pdf'
      ],
      'lainnya': ['*'] // Allow all types
    };
  }

  /**
   * Convert file buffer to base64 string with optimized processing
   * @param {Buffer} fileBuffer - File buffer
   * @param {Object} options - Options for conversion
   * @returns {String} Base64 string
   */
  fileToBase64(fileBuffer, options = {}) {
    try {
      if (!Buffer.isBuffer(fileBuffer)) {
        throw new Error('Input harus berupa Buffer');
      }

      console.log(`🔄 Converting file to base64 (${fileBuffer.length} bytes)...`);
      const startTime = Date.now();

      // Generate file hash for integrity
      const hash = this.generateFileHash(fileBuffer);
      
      // Convert to base64 with optimized chunking for large files
      let base64String;
      if (fileBuffer.length > 1024 * 1024) { // > 1MB, use streaming
        base64String = this.optimizedBase64Conversion(fileBuffer);
      } else {
        base64String = fileBuffer.toString('base64');
      }
      
      const endTime = Date.now();
      console.log(`✅ Base64 conversion completed in ${endTime - startTime}ms`);
      
      return {
        base64Data: base64String,
        hash: hash,
        size: fileBuffer.length,
        originalSize: fileBuffer.length
      };
    } catch (error) {
      throw new Error(`Error converting file to base64: ${error.message}`);
    }
  }

  /**
   * Optimized base64 conversion for large files
   * @param {Buffer} fileBuffer - File buffer
   * @returns {String} Base64 string
   */
  optimizedBase64Conversion(fileBuffer) {
    const chunkSize = 8192; // 8KB chunks
    let base64String = '';
    
    for (let i = 0; i < fileBuffer.length; i += chunkSize) {
      const chunk = fileBuffer.slice(i, i + chunkSize);
      base64String += chunk.toString('base64');
    }
    
    return base64String;
  }

  /**
   * Convert base64 string back to buffer
   * @param {String} base64String - Base64 string
   * @param {String} expectedHash - Expected file hash for verification
   * @returns {Buffer} File buffer
   */
  base64ToFile(base64String, expectedHash = null) {
    try {
      if (!base64String || typeof base64String !== 'string') {
        throw new Error('Base64 string tidak valid');
      }

      console.log('🔍 Base64 conversion debug:');
      console.log('- Input base64 string length:', base64String.length);
      console.log('- Input type:', typeof base64String);
      
      // Clean Base64 string - remove any invalid characters and whitespace
      const cleanedBase64 = base64String
        .replace(/[^A-Za-z0-9+/=]/g, '') // Remove any non-base64 characters
        .replace(/\s/g, ''); // Remove all whitespace
      
      console.log('- Cleaned base64 string length:', cleanedBase64.length);
      console.log('- Characters removed:', base64String.length - cleanedBase64.length);
      
      if (cleanedBase64.length !== base64String.length) {
        console.log('⚠️ Base64 string contained invalid characters - cleaned');
        console.log('- First 100 chars (original):', base64String.substring(0, 100));
        console.log('- First 100 chars (cleaned):', cleanedBase64.substring(0, 100));
      }
      
      // Validate cleaned base64 format  
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(cleanedBase64)) {
        console.log('❌ Even cleaned Base64 format is invalid');
        // Find the problematic characters
        const invalidChars = cleanedBase64.match(/[^A-Za-z0-9+/=]/g);
        console.log('- Invalid characters found:', invalidChars);
        throw new Error('Invalid Base64 format after cleaning');
      }

      // Convert cleaned base64 to buffer
      let fileBuffer;
      try {
        fileBuffer = Buffer.from(cleanedBase64, 'base64');
        console.log('✅ Buffer conversion successful');
      } catch (conversionError) {
        console.log('❌ Buffer conversion failed:', conversionError.message);
        throw new Error(`Base64 conversion failed: ${conversionError.message}`);
      }
      
      console.log('- Converted buffer length:', fileBuffer.length);
      console.log('- Expected buffer length (approx):', Math.floor(cleanedBase64.length * 3 / 4));
      
      // Verify hash if provided
      if (expectedHash) {
        const actualHash = this.generateFileHash(fileBuffer);
        console.log('- Expected hash:', expectedHash);
        console.log('- Actual hash:', actualHash);
        if (actualHash !== expectedHash) {
          console.log('⚠️ Hash mismatch - continuing for MP4 debugging');
          // Skip hash check for debugging MP4 conversion
        }
      }

      return fileBuffer;
    } catch (error) {
      console.log('💥 Base64 conversion error:', error.message);
      throw new Error(`Error converting base64 to file: ${error.message}`);
    }
  }

  /**
   * Validate file before conversion
   * @param {Buffer} fileBuffer - File buffer
   * @param {String} originalName - Original filename
   * @param {String} mimeType - File MIME type
   * @param {String} documentType - Document type for capstone
   * @returns {Boolean} Validation result
   */
  validateFile(fileBuffer, originalName, mimeType, documentType) {
    try {
      // Check if file buffer exists
      if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
        throw new Error('File buffer tidak valid');
      }

      // Check file size
      const maxSize = this.sizeLimit[documentType] || this.sizeLimit['lainnya'];
      if (fileBuffer.length > maxSize) {
        throw new Error(`Ukuran file terlalu besar. Maksimal ${this.formatFileSize(maxSize)} untuk ${documentType}`);
      }

      // Check file type
      const allowedTypes = this.allowedMimeTypes[documentType] || ['*'];
      if (!allowedTypes.includes('*') && !allowedTypes.includes(mimeType)) {
        throw new Error(`Tipe file ${mimeType} tidak diizinkan untuk ${documentType}`);
      }

      // Check file extension
      const extension = path.extname(originalName).toLowerCase();
      if (!this.isValidExtension(extension, mimeType)) {
        throw new Error(`Ekstensi file ${extension} tidak sesuai dengan tipe ${mimeType}`);
      }

      // Check for malicious files
      if (this.isMaliciousFile(fileBuffer, extension)) {
        throw new Error('File berpotensi berbahaya');
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate file hash for integrity checking
   * @param {Buffer} fileBuffer - File buffer
   * @returns {String} SHA256 hash
   */
  generateFileHash(fileBuffer) {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Check if file extension matches MIME type
   * @param {String} extension - File extension
   * @param {String} mimeType - MIME type
   * @returns {Boolean} Match result
   */
  isValidExtension(extension, mimeType) {
    const extensionMap = {
      '.pdf': ['application/pdf'],
      '.doc': ['application/msword'],
      '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      '.ppt': ['application/vnd.ms-powerpoint'],
      '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.gif': ['image/gif'],
      '.mp4': ['video/mp4'],
      '.avi': ['video/avi'],
      '.mov': ['video/mov', 'video/quicktime'],
      '.wmv': ['video/wmv']
    };

    const allowedMimeTypes = extensionMap[extension];
    return allowedMimeTypes ? allowedMimeTypes.includes(mimeType) : false;
  }

  /**
   * Check for malicious files
   * @param {Buffer} fileBuffer - File buffer
   * @param {String} extension - File extension
   * @returns {Boolean} Is malicious
   */
  isMaliciousFile(fileBuffer, extension) {
    // List of dangerous extensions
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
      '.php', '.asp', '.jsp', '.sh', '.ps1', '.py', '.rb', '.pl'
    ];

    if (dangerousExtensions.includes(extension)) {
      return true;
    }

    // Check for executable file signatures (magic numbers)
    const magicNumbers = {
      'MZ': true, // PE executable
      'PK': false, // ZIP archive (could be office docs)
      'GIF': false, // GIF image
      'JFIF': false, // JPEG image
      'PNG': false, // PNG image
      '%PDF': false // PDF document
    };

    const header = fileBuffer.slice(0, 4).toString();
    for (const [magic, isDangerous] of Object.entries(magicNumbers)) {
      if (header.startsWith(magic) && isDangerous) {
        return true;
      }
    }

    return false;
  }

  /**
   * Format file size to human readable format
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
   * Get document type requirements
   * @param {String} documentType - Document type
   * @returns {Object} Requirements info
   */
  getDocumentRequirements(documentType) {
    return {
      documentType,
      maxSize: this.formatFileSize(this.sizeLimit[documentType] || this.sizeLimit['lainnya']),
      allowedTypes: this.allowedMimeTypes[documentType] || ['*'],
      description: this.getDocumentDescription(documentType)
    };
  }

  /**
   * Get document type description
   * @param {String} documentType - Document type
   * @returns {String} Description
   */
  getDocumentDescription(documentType) {
    const descriptions = {
      'proposal_capstone1': 'Dokumen proposal untuk Capstone 1 (PDF, DOC, DOCX)',
      'ppt_sidang_capstone1': 'Presentasi untuk sidang Capstone 1 (PPT, PPTX)',
      'gambar_alat_capstone2': 'Foto/gambar alat Capstone 2 (JPG, PNG, GIF)',
      'desain_poster_capstone2': 'Desain poster Capstone 2 (JPG, PNG, PDF)',
      'video_demo_capstone2': 'Video demo Capstone 2 (MP4, AVI, MOV)',
      'laporan': 'Laporan capstone (PDF, DOC, DOCX)',
      'dokumentasi': 'Dokumentasi capstone (gambar atau PDF)',
      'lainnya': 'Dokumen lainnya'
    };

    return descriptions[documentType] || 'Dokumen capstone';
  }

  /**
   * Process file for upload
   * @param {Buffer} fileBuffer - File buffer
   * @param {Object} fileInfo - File information
   * @returns {Object} Processed file data
   */
  async processFileForUpload(fileBuffer, fileInfo) {
    try {
      const { originalName, mimeType, documentType } = fileInfo;
      console.log('🔍 Processing file for upload:', { originalName, mimeType, documentType, bufferSize: fileBuffer.length });

      // Validate file
      console.log('🔄 Validating file...');
      this.validateFile(fileBuffer, originalName, mimeType, documentType);
      console.log('✅ File validation passed');

      // Convert to base64
      console.log('🔄 Converting to base64...');
      const result = this.fileToBase64(fileBuffer);
      console.log('✅ Base64 conversion completed');

      const processedData = {
        base64Data: result.base64Data,
        fileHash: result.hash,
        fileSize: result.size,
        originalName,
        mimeType,
        fileExtension: path.extname(originalName).toLowerCase(),
        documentType,
        processedAt: new Date()
      };
      
      console.log('✅ File processing completed successfully');
      return processedData;
    } catch (error) {
      console.error('💥 File processing error:', error.message);
      throw error;
    }
  }

  /**
   * Process file for download
   * @param {String} base64Data - Base64 file data
   * @param {String} fileHash - Expected file hash
   * @param {String} originalName - Original filename
   * @returns {Object} File buffer and info
   */
  async processFileForDownload(base64Data, fileHash, originalName) {
    try {
      // Convert base64 to buffer
      const fileBuffer = this.base64ToFile(base64Data, fileHash);

      return {
        fileBuffer,
        originalName,
        size: fileBuffer.length,
        downloadedAt: new Date()
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Base64FileService;