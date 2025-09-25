const multer = require('multer');
const path = require('path');
const FileValidationManager = require('../utils/FileValidationManager');

// Use memory storage for base64 conversion (tidak simpan ke disk)
const storage = multer.memoryStorage();

// Use centralized file filter from FileValidationManager
const fileFilter = FileValidationManager.getMulterFileFilter();

const upload = multer({
  storage: storage, // Memory storage untuk base64
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 10, // Maksimal 10 files per upload
    fieldSize: 10 * 1024 * 1024, // 10MB field size limit
    fields: 50 // Maximum number of fields
  },
  fileFilter: fileFilter
});

console.log('📁 Multer upload middleware configured');

// Create a wrapper for upload.single with logging
const uploadSingle = (fieldname) => {
  return (req, res, next) => {
    console.log(`🔄 upload.single('${fieldname}') middleware started`);
    console.log('📦 Request headers:', {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length']
    });
    
    const uploadHandler = upload.single(fieldname);
    uploadHandler(req, res, (err) => {
      if (err) {
        console.error(`❌ upload.single('${fieldname}') error:`, err);
        return next(err);
      }
      
      console.log(`✅ upload.single('${fieldname}') completed successfully`);
      console.log('📎 File info:', req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file');
      
      next();
    });
  };
};

// Error handler untuk multer
const handleMulterError = (error, req, res, next) => {
  console.log('Multer error handler trigger', error.message);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File terlalu besar! Maksimal 100MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Terlalu banyak file! Maksimal 10 file per upload'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Field file tidak dikenali'
      });
    }
  }

  if (error.message.includes('Tipe file tidak diizinkan')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

module.exports = {
  upload,
  uploadSingle,
  handleMulterError
};