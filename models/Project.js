const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Judul project harus diisi'],
    trim: true,
    maxlength: [200, 'Judul project tidak boleh lebih dari 200 karakter']
  },
  description: {
    type: String,
    required: [true, 'Deskripsi project harus diisi'],
    maxlength: [2000, 'Deskripsi tidak boleh lebih dari 2000 karakter']
  },
  category: {
    type: String,
    required: [true, 'Kategori project harus dipilih'],
    enum: {
      values: ['kesehatan', 'smart_city', 'pengelolaan_sampah', 'pendidikan', 'teknologi', 'lingkungan', 'ekonomi', 'sosial'],
      message: 'Kategori tidak valid'
    }
  },
  status: {
    type: String,
    enum: ['bisa_dilanjutkan', 'ditutup'],
    default: 'bisa_dilanjutkan'
  },
  academicYear: {
    type: String,
    required: [true, 'Tahun ajaran harus diisi'],
    match: [/^\d{4}\/\d{4}$/, 'Format tahun ajaran harus YYYY/YYYY (contoh: 2024/2025)']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner project harus ada']
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Grup project harus ada']
  },
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  tags: [{
    type: String,
    trim: true
  }],
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
projectSchema.index({ category: 1, status: 1 });
projectSchema.index({ academicYear: 1 });
projectSchema.index({ owner: 1 });
projectSchema.index({ title: 'text', description: 'text' });

// Virtual untuk menghitung jumlah dokumen
projectSchema.virtual('documentCount').get(function() {
  return this.documents ? this.documents.length : 0;
});

// Middleware untuk update timestamp
projectSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// Middleware untuk populate documents secara otomatis
projectSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'documents',
    match: { isActive: true },
    select: 'title filename fileSize mimeType createdAt'
  });
  next();
});

module.exports = mongoose.model('Project', projectSchema);