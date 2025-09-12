const mongoose = require('mongoose');

const continuationRequestSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project harus ada']
  },
  requestingGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Grup yang mengajukan harus ada']
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User yang mengajukan harus ada']
  },
  requestMessage: {
    type: String,
    required: [true, 'Pesan permintaan harus diisi'],
    trim: true,
    maxlength: [1000, 'Pesan permintaan tidak boleh lebih dari 1000 karakter']
  },
  proposedPlan: {
    type: String,
    trim: true,
    maxlength: [2000, 'Rencana pengembangan tidak boleh lebih dari 2000 karakter']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'approved_by_owner', 'approved_by_lecturer', 'rejected_by_owner', 'rejected_by_lecturer', 'completed'],
      message: 'Status tidak valid'
    },
    default: 'pending'
  },
  ownerResponse: {
    message: {
      type: String,
      trim: true,
      maxlength: [500, 'Pesan respon tidak boleh lebih dari 500 karakter']
    },
    respondedAt: {
      type: Date
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  lecturerResponse: {
    message: {
      type: String,
      trim: true,
      maxlength: [500, 'Pesan respon tidak boleh lebih dari 500 karakter']
    },
    respondedAt: {
      type: Date
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  academicYear: {
    type: String,
    required: [true, 'Tahun ajaran harus diisi'],
    match: [/^\d{4}\/\d{4}$/, 'Format tahun ajaran harus YYYY/YYYY (contoh: 2024/2025)']
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
continuationRequestSchema.index({ project: 1, status: 1 });
continuationRequestSchema.index({ requestingGroup: 1 });
continuationRequestSchema.index({ requestedBy: 1 });
continuationRequestSchema.index({ academicYear: 1 });
continuationRequestSchema.index({ createdAt: -1 });

// Virtual untuk check apakah sudah disetujui owner
continuationRequestSchema.virtual('isApprovedByOwner').get(function() {
  return this.status === 'approved_by_owner' || this.status === 'approved_by_lecturer' || this.status === 'completed';
});

// Virtual untuk check apakah sudah disetujui lecturer
continuationRequestSchema.virtual('isApprovedByLecturer').get(function() {
  return this.status === 'approved_by_lecturer' || this.status === 'completed';
});

// Virtual untuk check apakah masih pending
continuationRequestSchema.virtual('isPending').get(function() {
  return this.status === 'pending' || this.status === 'approved_by_owner';
});

// Virtual untuk check apakah sudah ditolak
continuationRequestSchema.virtual('isRejected').get(function() {
  return this.status === 'rejected_by_owner' || this.status === 'rejected_by_lecturer';
});

// Virtual untuk check apakah sudah selesai (approved atau rejected)
continuationRequestSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed' || this.isRejected;
});

// Middleware untuk populate references
continuationRequestSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'project',
    select: 'title description category owner'
  }).populate({
    path: 'requestingGroup',
    select: 'name members academicYear'
  }).populate({
    path: 'requestedBy',
    select: 'firstName lastName email studentId'
  }).populate({
    path: 'ownerResponse.respondedBy',
    select: 'firstName lastName email'
  }).populate({
    path: 'lecturerResponse.respondedBy',
    select: 'firstName lastName email'
  });
  next();
});

// Instance method untuk approval by owner
continuationRequestSchema.methods.approveByOwner = function(ownerId, message = '') {
  if (this.status !== 'pending') {
    throw new Error('Request sudah diproses sebelumnya');
  }
  
  this.status = 'approved_by_owner';
  this.ownerResponse = {
    message: message,
    respondedAt: new Date(),
    respondedBy: ownerId
  };
  
  return this.save();
};

// Instance method untuk rejection by owner
continuationRequestSchema.methods.rejectByOwner = function(ownerId, message = '') {
  if (this.status !== 'pending') {
    throw new Error('Request sudah diproses sebelumnya');
  }
  
  if (!message.trim()) {
    throw new Error('Alasan penolakan harus diisi');
  }
  
  this.status = 'rejected_by_owner';
  this.ownerResponse = {
    message: message,
    respondedAt: new Date(),
    respondedBy: ownerId
  };
  
  return this.save();
};

// Instance method untuk approval by lecturer
continuationRequestSchema.methods.approveByLecturer = function(lecturerId, message = '') {
  if (this.status !== 'approved_by_owner') {
    throw new Error('Request harus disetujui owner terlebih dahulu');
  }
  
  this.status = 'approved_by_lecturer';
  this.lecturerResponse = {
    message: message,
    respondedAt: new Date(),
    respondedBy: lecturerId
  };
  
  return this.save();
};

// Instance method untuk rejection by lecturer
continuationRequestSchema.methods.rejectByLecturer = function(lecturerId, message = '') {
  if (this.status !== 'approved_by_owner') {
    throw new Error('Request harus disetujui owner terlebih dahulu');
  }
  
  if (!message.trim()) {
    throw new Error('Alasan penolakan harus diisi');
  }
  
  this.status = 'rejected_by_lecturer';
  this.lecturerResponse = {
    message: message,
    respondedAt: new Date(),
    respondedBy: lecturerId
  };
  
  return this.save();
};

// Instance method untuk mark as completed (final approval)
continuationRequestSchema.methods.markAsCompleted = function() {
  if (this.status !== 'approved_by_lecturer') {
    throw new Error('Request harus disetujui lecturer terlebih dahulu');
  }
  
  this.status = 'completed';
  return this.save();
};

// Static method untuk find requests by project
continuationRequestSchema.statics.findByProject = function(projectId) {
  return this.find({
    project: projectId,
    isActive: true
  }).sort({ createdAt: -1 });
};

// Static method untuk find requests by group
continuationRequestSchema.statics.findByGroup = function(groupId) {
  return this.find({
    requestingGroup: groupId,
    isActive: true
  }).sort({ createdAt: -1 });
};

// Static method untuk find pending requests for owner
continuationRequestSchema.statics.findPendingForOwner = function(ownerId) {
  return this.find({
    status: 'pending',
    isActive: true
  }).populate('project')
    .then(requests => {
      return requests.filter(request => 
        request.project && request.project.owner.toString() === ownerId.toString()
      );
    });
};

// Static method untuk find pending requests for lecturer
continuationRequestSchema.statics.findPendingForLecturer = function(lecturerId) {
  return this.find({
    status: 'approved_by_owner',
    isActive: true
  }).populate({
    path: 'requestingGroup',
    match: { advisor: lecturerId }
  }).then(requests => {
    return requests.filter(request => request.requestingGroup !== null);
  });
};

module.exports = mongoose.model('ContinuationRequest', continuationRequestSchema);