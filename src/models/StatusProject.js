const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Judul proyek harus diisi'],
    trim: true,
    maxlength: [200, 'Judul proyek tidak boleh lebih dari 200 karakter']
  },
  description: {
    type: String,
    required: [true, 'Deskripsi proyek harus diisi'],
    trim: true,
    maxlength: [2000, 'Deskripsi tidak boleh lebih dari 2000 karakter']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Mahasiswa pemilik proyek
    required: [true, 'Pemilik proyek harus ada']
  },
  academicYear: {
    type: String,
    required: [true, 'Tahun ajaran harus diisi'],
    match: [/^\d{4}\/\d{4}$/, 'Format tahun ajaran harus YYYY/YYYY (contoh: 2024/2025)']
  },
  status: {
    type: String,
    enum: {
      values: ['bisa_dilanjutkan', 'ditutup'],
      message: 'Status harus "bisa_dilanjutkan" atau "ditutup"'
    },
    default: 'bisa_dilanjutkan',
    required: [true, 'Status proyek harus diisi']
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['bisa_dilanjutkan', 'ditutup'],
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Alasan tidak boleh lebih dari 500 karakter']
    }
  }],
  category: {
    type: String,
    required: [true, 'Kategori proyek harus diisi'],
    enum: [
      'web_development', 
      'mobile_development', 
      'data_science', 
      'ai_ml', 
      'iot', 
      'game_development',
      'cybersecurity',
      'other'
    ]
  },
  technology: [{
    type: String,
    trim: true
  }],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  maxGroups: {
    type: Number,
    default: 1,
    min: [1, 'Minimal 1 grup dapat mengambil proyek'],
    max: [5, 'Maksimal 5 grup dapat mengambil proyek']
  },
  assignedGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  advisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Dosen pembimbing yang disarankan
    required: [true, 'Dosen pembimbing harus ada']
  },
  requirements: {
    type: String,
    trim: true,
    maxlength: [1000, 'Requirements tidak boleh lebih dari 1000 karakter']
  },
  expectedOutcome: {
    type: String,
    trim: true,
    maxlength: [1000, 'Expected outcome tidak boleh lebih dari 1000 karakter']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index untuk optimasi query
projectSchema.index({ owner: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ academicYear: 1 });
projectSchema.index({ category: 1 });
projectSchema.index({ advisor: 1 });
projectSchema.index({ createdAt: -1 });

// Virtual untuk status dalam bahasa Indonesia
projectSchema.virtual('statusIndonesian').get(function() {
  const statusMap = {
    'bisa_dilanjutkan': 'Bisa Dilanjutkan',
    'ditutup': 'Ditutup'
  };
  return statusMap[this.status] || this.status;
});

// Virtual untuk check apakah proyek masih bisa diambil grup
projectSchema.virtual('isAvailable').get(function() {
  return this.status === 'bisa_dilanjutkan' && 
         this.assignedGroups.length < this.maxGroups;
});

// Virtual untuk menghitung jumlah grup yang sudah mengambil
projectSchema.virtual('assignedGroupsCount').get(function() {
  return this.assignedGroups ? this.assignedGroups.length : 0;
});

// Virtual untuk mendapatkan status history terakhir
projectSchema.virtual('lastStatusChange').get(function() {
  if (!this.statusHistory || this.statusHistory.length === 0) return null;
  return this.statusHistory[this.statusHistory.length - 1];
});

// Middleware untuk update updatedAt
projectSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Middleware untuk populate owner, advisor, dan assignedGroups
projectSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'owner',
    select: 'firstName lastName email studentId'
  }).populate({
    path: 'advisor',
    select: 'firstName lastName email employeeId department'
  }).populate({
    path: 'assignedGroups',
    select: 'name members academicYear'
  }).populate({
    path: 'statusHistory.changedBy',
    select: 'firstName lastName email'
  });
  next();
});

// Instance method untuk mengubah status proyek
projectSchema.methods.changeStatus = function(newStatus, changedBy, reason = '') {
  // Validasi: hanya owner yang bisa mengubah status
  if (this.owner._id.toString() !== changedBy.toString()) {
    throw new Error('Hanya pemilik proyek yang dapat mengubah status');
  }

  // Validasi: status harus berbeda
  if (this.status === newStatus) {
    throw new Error('Status baru harus berbeda dari status saat ini');
  }

  // Validasi: status harus valid
  if (!['bisa_dilanjutkan', 'ditutup'].includes(newStatus)) {
    throw new Error('Status tidak valid');
  }

  // Simpan ke history
  this.statusHistory.push({
    status: newStatus,
    changedAt: new Date(),
    changedBy: changedBy,
    reason: reason
  });

  // Update status
  this.status = newStatus;
  
  return this.save();
};

// Instance method untuk menambah grup yang mengambil proyek
projectSchema.methods.assignGroup = function(groupId) {
  // Check apakah proyek masih tersedia
  if (!this.isAvailable) {
    throw new Error('Proyek tidak tersedia atau sudah mencapai batas maksimal grup');
  }

  // Check apakah grup sudah terdaftar
  const isAlreadyAssigned = this.assignedGroups.some(
    group => group._id.toString() === groupId.toString()
  );

  if (isAlreadyAssigned) {
    throw new Error('Grup sudah mengambil proyek ini');
  }

  this.assignedGroups.push(groupId);
  return this.save();
};

// Instance method untuk menghapus grup dari proyek
projectSchema.methods.removeGroup = function(groupId) {
  const groupIndex = this.assignedGroups.findIndex(
    group => group._id.toString() === groupId.toString()
  );

  if (groupIndex === -1) {
    throw new Error('Grup tidak terdaftar dalam proyek ini');
  }

  this.assignedGroups.splice(groupIndex, 1);
  return this.save();
};

// Static method untuk find proyek berdasarkan owner
projectSchema.statics.findByOwner = function(ownerId) {
  return this.find({ owner: ownerId }).sort({ createdAt: -1 });
};

// Static method untuk find proyek yang tersedia
projectSchema.statics.findAvailable = function(academicYear = null) {
  const query = { status: 'bisa_dilanjutkan' };
  if (academicYear) {
    query.academicYear = academicYear;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Static method untuk find proyek berdasarkan advisor
projectSchema.statics.findByAdvisor = function(advisorId) {
  return this.find({ advisor: advisorId }).sort({ createdAt: -1 });
};

// Static method untuk find proyek berdasarkan kategori
projectSchema.statics.findByCategory = function(category) {
  return this.find({ category: category, status: 'bisa_dilanjutkan' })
         .sort({ createdAt: -1 });
};

// Static method untuk statistik proyek
projectSchema.statics.getProjectStats = function(academicYear = null) {
  const matchCondition = academicYear ? { academicYear } : {};
  
  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Project', projectSchema);
