const mongoose = require('mongoose');
const path = require('path');
const FileValidationManager = require('../utils/FileValidationManager');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Judul dokumen harus diisi'],
    trim: true,
    minlength: [3, 'Judul dokumen minimal 3 karakter'],
    maxlength: [200, 'Judul dokumen tidak boleh lebih dari 200 karakter']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Deskripsi tidak boleh lebih dari 1000 karakter']
  },
  
  // File information with centralized validation
  originalName: {
    type: String,
    required: [true, 'Nama file asli harus ada'],
    maxlength: [255, 'Nama file terlalu panjang']
  },
  fileSize: {
    type: Number,
    required: [true, 'Ukuran file harus ada'],
    min: [1, 'File tidak boleh kosong']
  },
  mimeType: {
    type: String,
    required: [true, 'Tipe file harus ada']
  },
  fileExtension: {
    type: String,
    required: [true, 'Ekstensi file harus ada']
  },
  
  // Base64 storage
  fileData: {
    type: String,
    required: [true, 'Data file base64 harus ada']
  },
  
  // Capstone category
  capstoneCategory: {
    type: String,
    required: [true, 'Kategori capstone harus diisi'],
    enum: {
      values: ['capstone1', 'capstone2', 'general'],
      message: 'Kategori capstone harus capstone1, capstone2, atau general'
    }
  },
  
  // Document type
  documentType: {
    type: String,
    required: [true, 'Tipe dokumen harus diisi']
  },
  
  // Project reference - tema is handled at project level
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  
  // Author info
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User yang upload harus ada']
  },
  
  // File hash for integrity
  fileHash: {
    type: String,
    required: [true, 'Hash file harus ada']
  },
  
  // Metadata
  isPublic: {
    type: Boolean,
    default: true  // Semua dokumen public agar mahasiswa bisa saling melihat
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag terlalu panjang']
  }],
  downloadCount: {
    type: Number,
    default: 0,
    min: [0, 'Download count tidak boleh negatif']
  },
  version: {
    type: String,
    default: '1.0'
  },
  compressionLevel: {
    type: Number,
    default: 0,
    min: [0, 'Compression level tidak boleh negatif'],
    max: [9, 'Compression level maksimal 9']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save validation using FileValidationManager
documentSchema.pre('save', function(next) {
  try {
    // Validate file info using centralized manager
    const fileInfo = {
      originalName: this.originalName,
      size: this.fileSize,
      mimeType: this.mimeType,
      documentType: this.documentType
    };

    const validation = FileValidationManager.validateFile(fileInfo);
    
    if (!validation.isValid) {
      const error = new Error(validation.error);
      error.name = 'ValidationError';
      return next(error);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Indexes for performance
documentSchema.index({ capstoneCategory: 1, documentType: 1 });
documentSchema.index({ project: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ isPublic: 1 });
documentSchema.index({ createdAt: -1 });

// Virtual untuk formatted file size
documentSchema.virtual('formattedFileSize').get(function() {
  return FileValidationManager.formatFileSize(this.fileSize);
});

// Virtual untuk file category
documentSchema.virtual('fileCategory').get(function() {
  return FileValidationManager.getFileCategory(this.mimeType);
});

module.exports = mongoose.model('Document', documentSchema);
