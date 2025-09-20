const mongoose = require('mongoose');
const { getValidThemesDash } = require('../configs/themes');

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
  
  // Tema project untuk filtering (4 tema sesuai spesifikasi)
  tema: {
    type: String,
    required: [true, 'Tema project harus dipilih'],
    enum: {
      values: getValidThemesDash(),
      message: `Tema harus salah satu dari: ${getValidThemesDash().join(', ')}`
    },
    index: true
  },
  
  // Status project
  status: {
    type: String,
    enum: ['active', 'completed', 'suspended', 'deactive'],
    default: 'active'
  },
  academicYear: {
    type: String,
    required: [true, 'Tahun ajaran harus diisi'],
    match: [/^(Gasal|Genap)-\d{4}$/, 'Format [Semester]-[Tahun] (Gasal-2025, Genap-2026)']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner project harus ada']
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  timestamps: {
    currentTime: () => {
      const now = new Date();
      const jakartaOffset = 7 * 60; // UTC+7 in minutes
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      return new Date(utc + (jakartaOffset * 60000));
    }
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

projectSchema.index({ category: 1, status: 1 });
projectSchema.index({ capstoneType: 1, status: 1 });
projectSchema.index({ category: 1, capstoneType: 1 });
projectSchema.index({ academicYear: 1 });
projectSchema.index({ owner: 1 });
projectSchema.index({ title: 'text', description: 'text' });

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

module.exports = mongoose.model('Project', projectSchema);