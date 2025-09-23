/**
 * File Validation Middleware - Refactored to use FileValidationManager
 */

const path = require('path');
const FileValidationManager = require('../utils/FileValidationManager');

// Validasi berdasarkan capstone category dan document type
const CAPSTONE_FILE_RULES = {
  capstone1: {
    proposal: ['document'],
    presentasi_sidang: ['presentation'], 
    laporan_kemajuan: ['document'],
    dokumentasi: ['document', 'image'],
    lainnya: ['document', 'image', 'archive']
  },
  capstone2: {
    gambar_alat: ['image'],
    desain_poster: ['image', 'document'],
    video_demo: ['video'],
    laporan_akhir: ['document'],
    dokumentasi: ['document', 'image', 'video'],
    lainnya: ['document', 'image', 'video', 'archive']
  }
};

/**
 * Middleware untuk validasi file upload menggunakan FileValidationManager
 */
const validateFileUpload = (req, res, next) => {
  console.log('🔍 File validation middleware started');
  console.log('📦 Request file:', req.file ? 'Present' : 'Missing');
  console.log('📦 Request body fileData:', req.body.fileData ? 'Present' : 'Missing');
  
  try {
    // Cek apakah ada file
    if (!req.file && !req.body.fileData) {
      console.log('❌ File validation failed: No file provided');
      return res.status(400).json({
        success: false,
        message: 'File harus diunggah',
        data: null
      });
    }

    let fileInfo = {};
    
    // Jika menggunakan multer
    if (req.file) {
      fileInfo = {
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
        documentType: req.body.documentType
      };
    }
    // Jika menggunakan base64 direct
    else if (req.body.fileData) {
      // Parse base64 untuk mendapatkan info
      const base64Data = req.body.fileData;
      const size = Math.round((base64Data.length * 3) / 4);
      
      fileInfo = {
        originalName: req.body.originalName || 'unknown',
        size: size,
        mimeType: req.body.mimeType || 'application/octet-stream',
        buffer: null,
        documentType: req.body.documentType
      };
    }

    // Validasi nama file
    if (!fileInfo.originalName || fileInfo.originalName.length > 255) {
      return res.status(400).json({
        success: false,
        message: 'Nama file tidak valid atau terlalu panjang (max 255 karakter)',
        data: null
      });
    }

    // Gunakan FileValidationManager untuk validasi comprehensive
    const validation = FileValidationManager.validateFile(fileInfo);
    
    if (!validation.isValid) {
      console.log('❌ File validation failed:', validation.error);
      return res.status(400).json({
        success: false,
        message: validation.error,
        data: {
          allowedTypes: validation.allowedTypes || FileValidationManager.getAllowedMimeTypes(),
          allowedExtensions: validation.allowedExtensions || FileValidationManager.getAllowedExtensions(),
          maxSize: validation.maxSize,
          currentSize: validation.currentSize
        }
      });
    }

    // Validasi capstone specific rules jika ada
    if (req.body.capstoneCategory && req.body.documentType) {
      const isValidForCapstone = validateCapstoneRules(
        req.body.capstoneCategory, 
        req.body.documentType, 
        validation.fileInfo.category
      );
      
      if (!isValidForCapstone.isValid) {
        return res.status(400).json({
          success: false,
          message: isValidForCapstone.message,
          data: null
        });
      }
    }

    console.log('✅ File validation passed');
    console.log('📊 File info:', {
      name: fileInfo.originalName,
      size: FileValidationManager.formatFileSize(fileInfo.size),
      type: fileInfo.mimeType,
      category: validation.fileInfo.category
    });

    // Attach validation result ke request untuk use selanjutnya
    req.fileValidation = {
      ...validation,
      fileInfo: {
        ...fileInfo,
        ...validation.fileInfo
      }
    };

    next();
  } catch (error) {
    console.error('❌ File validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat validasi file',
      data: null
    });
  }
};

/**
 * Validasi aturan spesifik capstone
 * @param {String} capstoneCategory - capstone1 atau capstone2
 * @param {String} documentType - Jenis dokumen
 * @param {String} fileCategory - Kategori file yang diupload
 * @returns {Object} Hasil validasi
 */
const validateCapstoneRules = (capstoneCategory, documentType, fileCategory) => {
  const rules = CAPSTONE_FILE_RULES[capstoneCategory];
  
  if (!rules) {
    return {
      isValid: false,
      message: `Capstone category '${capstoneCategory}' tidak valid`
    };
  }

  const allowedCategories = rules[documentType];
  if (!allowedCategories) {
    return {
      isValid: false,
      message: `Document type '${documentType}' tidak valid untuk ${capstoneCategory}`
    };
  }

  if (!allowedCategories.includes(fileCategory)) {
    return {
      isValid: false,
      message: `File category '${fileCategory}' tidak diizinkan untuk ${documentType} di ${capstoneCategory}. Diizinkan: ${allowedCategories.join(', ')}`
    };
  }

  return { isValid: true };
};

module.exports = {
  validateFileUpload,
  validateCapstoneRules
};
