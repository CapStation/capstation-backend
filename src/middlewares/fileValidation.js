/**
 * File Validation Middleware dengan Limits dan Type Checking Ketat
 * Update untuk struktur capstone category baru
 */

const path = require('path');

// File size limits berdasarkan kategori
const FILE_SIZE_LIMITS = {
  // Documents (PDF, DOC, DOCX)
  document: 10 * 1024 * 1024, // 10MB
  
  // Presentations (PPT, PPTX)
  presentation: 15 * 1024 * 1024, // 15MB
  
  // Images (JPG, PNG, GIF, WEBP)
  image: 5 * 1024 * 1024, // 5MB
  
  // Videos (MP4, WEBM, AVI)
  video: 50 * 1024 * 1024, // 50MB
  
  // Archives (ZIP, RAR)
  archive: 20 * 1024 * 1024, // 20MB
  
  // Default
  default: 10 * 1024 * 1024 // 10MB
};

// Allowed MIME types dengan kategori
const ALLOWED_MIME_TYPES = {
  // Documents
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  
  // Presentations
  'application/vnd.ms-powerpoint': 'presentation',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentation',
  
  // Images
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  
  // Videos
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/avi': 'video',
  
  // Archives
  'application/zip': 'archive',
  'application/x-rar-compressed': 'archive'
};

// File extensions yang diizinkan
const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx',           // Documents
  '.ppt', '.pptx',                   // Presentations
  '.jpg', '.jpeg', '.png', '.gif', '.webp', // Images
  '.mp4', '.webm', '.avi',           // Videos
  '.zip', '.rar'                     // Archives
];

// Validasi berdasarkan capstone category dan document type
const CAPSTONE_FILE_RULES = {
  capstone1: {
    proposal: ['document'], // PDF, DOC, DOCX
    presentasi_sidang: ['presentation'], // PPT, PPTX
    laporan_kemajuan: ['document'],
    dokumentasi: ['document', 'image'],
    lainnya: ['document', 'image', 'archive']
  },
  capstone2: {
    gambar_alat: ['image'], // JPG, PNG, WEBP
    desain_poster: ['image', 'document'], // Image atau PDF
    video_demo: ['video'], // MP4, WEBM, AVI
    laporan_akhir: ['document'],
    dokumentasi: ['document', 'image', 'video'],
    lainnya: ['document', 'image', 'video', 'archive']
  }
};

/**
 * Middleware untuk validasi file upload dengan limits ketat
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
        buffer: req.file.buffer
      };
    }
    // Jika menggunakan base64 direct
    else if (req.body.fileData) {
      // Parse base64 untuk mendapatkan info
      const base64Data = req.body.fileData;
      const size = Math.round((base64Data.length * 3) / 4); // Estimasi ukuran dari base64
      
      fileInfo = {
        originalName: req.body.originalName || 'unknown',
        size: size,
        mimeType: req.body.mimeType || 'application/octet-stream',
        buffer: null
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

    // Validasi ekstensi file
    const fileExtension = path.extname(fileInfo.originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return res.status(400).json({
        success: false,
        message: `Ekstensi file tidak diizinkan. Ekstensi yang diizinkan: ${ALLOWED_EXTENSIONS.join(', ')}`,
        data: null
      });
    }

    // Validasi MIME type
    if (!ALLOWED_MIME_TYPES[fileInfo.mimeType]) {
      console.log('❌ MIME type validation failed:');
      console.log('- File MIME type:', fileInfo.mimeType);
      console.log('- Allowed MIME types:', Object.keys(ALLOWED_MIME_TYPES));
      return res.status(400).json({
        success: false,
        message: `Tipe file tidak diizinkan. MIME type: ${fileInfo.mimeType}`,
        data: {
          receivedMimeType: fileInfo.mimeType,
          allowedMimeTypes: Object.keys(ALLOWED_MIME_TYPES)
        }
      });
    }

    // Dapatkan kategori file
    const fileCategory = ALLOWED_MIME_TYPES[fileInfo.mimeType];
    console.log('✅ File category determined:', fileCategory);
    
    // Validasi ukuran file berdasarkan kategori
    const maxSize = FILE_SIZE_LIMITS[fileCategory] || FILE_SIZE_LIMITS.default;
    if (fileInfo.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return res.status(400).json({
        success: false,
        message: `Ukuran file terlalu besar. Maksimal ${maxSizeMB}MB untuk tipe ${fileCategory}`,
        data: null
      });
    }

    // Validasi berdasarkan capstone category dan document type
    const { capstoneCategory, documentType } = req.body;
    
    if (capstoneCategory && documentType) {
      const rules = CAPSTONE_FILE_RULES[capstoneCategory];
      if (rules && rules[documentType]) {
        const allowedCategories = rules[documentType];
        if (!allowedCategories.includes(fileCategory)) {
          return res.status(400).json({
            success: false,
            message: `Tipe file tidak sesuai untuk ${capstoneCategory} - ${documentType}. Tipe yang diizinkan: ${allowedCategories.join(', ')}`,
            data: null
          });
        }
      }
    }

    // Validasi nama file untuk keamanan
    const dangerousPatterns = [
      /\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.scr$/i, /\.vbs$/i,
      /\.js$/i, /\.jar$/i, /\.com$/i, /\.pif$/i, /\.lnk$/i,
      /\.php$/i, /\.asp$/i, /\.jsp$/i, /\.sh$/i, /\.ps1$/i
    ];
    
    if (dangerousPatterns.some(pattern => pattern.test(fileInfo.originalName))) {
      return res.status(400).json({
        success: false,
        message: 'Nama file mengandung ekstensi yang tidak aman',
        data: null
      });
    }

    // Simpan info file ke request untuk digunakan controller
    req.validatedFile = {
      ...fileInfo,
      extension: fileExtension,
      category: fileCategory
    };

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `File validation error: ${error.message}`,
      data: null
    });
  }
};

/**
 * Middleware khusus untuk validasi file capstone 1
 */
const validateCapstone1File = (req, res, next) => {
  req.body.capstoneCategory = 'capstone1';
  validateFileUpload(req, res, next);
};

/**
 * Middleware khusus untuk validasi file capstone 2
 */
const validateCapstone2File = (req, res, next) => {
  req.body.capstoneCategory = 'capstone2';
  validateFileUpload(req, res, next);
};

/**
 * Middleware untuk validasi multiple files (bulk upload)
 */
const validateMultipleFiles = (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Minimal 1 file harus diunggah',
        data: null
      });
    }

    // Validasi maksimal 10 files sekaligus
    if (req.files.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maksimal 10 file dapat diunggah sekaligus',
        data: null
      });
    }

    // Validasi total ukuran semua files
    const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = 100 * 1024 * 1024; // 100MB total
    
    if (totalSize > maxTotalSize) {
      return res.status(400).json({
        success: false,
        message: 'Total ukuran file tidak boleh lebih dari 100MB',
        data: null
      });
    }

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Multiple file validation error: ${error.message}`,
      data: null
    });
  }
};

/**
 * Validasi file size berdasarkan tema project
 */
const validateFileByProjectTheme = (req, res, next) => {
  try {
    const { tema } = req.body;
    
    // Tema yang memerlukan file besar (video, gambar high-res)
    const highDataThemes = ['smart_city', 'teknologi_informasi', 'rekayasa_perangkat_lunak'];
    
    if (highDataThemes.includes(tema)) {
      // Izinkan file lebih besar untuk tema tertentu
      req.allowLargerFiles = true;
    }
    
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Theme validation error: ${error.message}`,
      data: null
    });
  }
};

module.exports = {
  validateFileUpload,
  validateCapstone1File,
  validateCapstone2File,
  validateMultipleFiles,
  validateFileByProjectTheme,
  FILE_SIZE_LIMITS,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  CAPSTONE_FILE_RULES
};