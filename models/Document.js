const mongoose = require('mongoose');
const path = require('path');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Judul dokumen harus diisi'],
    trim: true,
    maxlength: [200, 'Judul dokumen tidak boleh lebih dari 200 karakter']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Deskripsi tidak boleh lebih dari 1000 karakter']
  },
  filename: {
    type: String,
    required: [true, 'Filename harus ada']
  },
  originalName: {
    type: String,
    required: [true, 'Nama file asli harus ada']
  },
  filePath: {
    type: String,
    required: [true, 'Path file harus ada']
  },
  fileSize: {
    type: Number,
    required: [true, 'Ukuran file harus ada'],
    max: [10485760, 'Ukuran file tidak boleh lebih dari 10MB'] // 10MB in bytes
  },
  mimeType: {
    type: String,
    required: [true, 'Tipe file harus ada']
  },
  fileExtension: {
    type: String
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project harus ada']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader harus ada']
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index untuk optimasi query
documentSchema.index({ project: 1, createdAt: -1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ mimeType: 1 });

// Virtual untuk format ukuran file
documentSchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual untuk mendapatkan URL download
documentSchema.virtual('downloadUrl').get(function() {
  return `/api/documents/download/${this._id}`;
});

// Middleware untuk set file extension
documentSchema.pre('save', function(next) {
  if (this.originalName) {
    this.fileExtension = path.extname(this.originalName).toLowerCase();
  }
  next();
});

// Middleware untuk hapus file dari filesystem ketika document dihapus
documentSchema.pre('deleteOne', { document: true, query: false }, function(next) {
  const fs = require('fs');
  if (fs.existsSync(this.filePath)) {
    try {
      fs.unlinkSync(this.filePath);
      console.log(`File ${this.filename} berhasil dihapus dari filesystem`);
    } catch (error) {
      console.error(`Error menghapus file ${this.filename}:`, error);
    }
  }
  next();
});

module.exports = mongoose.model('Document', documentSchema);