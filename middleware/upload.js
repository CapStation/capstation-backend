const multer = require('multer');
const path = require('path');

// Use memory storage for base64 conversion (tidak simpan ke disk)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  console.log('🔍 Multer file filter processing:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });
  
  // Allowed file types
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/gif',
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv'
  ];

  const allowedExtensions = [
    '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', 
    '.jpg', '.jpeg', '.png', '.gif', '.mp4', '.avi', '.mov', '.wmv'
  ];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    console.log('✅ File filter passed');
    cb(null, true);
  } else {
    console.log('❌ File filter rejected:', { mimetype: file.mimetype, extension: fileExtension });
    cb(new Error('Tipe file tidak diizinkan! Lihat dokumentasi untuk tipe file yang valid.'), false);
  }
};

const upload = multer({
  storage: storage, // Memory storage untuk base64
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (disesuaikan dengan video)
    files: 1 // Maksimal 1 file per upload
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
  console.log('⚠️ Multer error handler triggered:', error.message);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File terlalu besar! Maksimal 50MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Terlalu banyak file! Maksimal 1 file per upload'
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