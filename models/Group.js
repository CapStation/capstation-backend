const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nama grup harus diisi'],
    trim: true,
    maxlength: [100, 'Nama grup tidak boleh lebih dari 100 karakter']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Deskripsi tidak boleh lebih dari 500 karakter']
  },
  academicYear: {
    type: String,
    required: [true, 'Tahun ajaran harus diisi'],
    match: [/^\d{4}\/\d{4}$/, 'Format tahun ajaran harus YYYY/YYYY (contoh: 2024/2025)']
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['leader', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  advisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Should be a lecturer
    required: [true, 'Dosen pembimbing harus ada']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  maxMembers: {
    type: Number,
    default: 5,
    min: [2, 'Grup minimal 2 orang'],
    max: [8, 'Grup maksimal 8 orang']
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
groupSchema.index({ academicYear: 1 });
groupSchema.index({ advisor: 1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ isActive: 1 });

// Virtual untuk menghitung jumlah anggota
groupSchema.virtual('memberCount').get(function() {
  return this.members ? this.members.length : 0;
});

// Virtual untuk mendapatkan leader grup
groupSchema.virtual('leader').get(function() {
  if (!this.members) return null;
  const leader = this.members.find(member => member.role === 'leader');
  return leader ? leader.user : null;
});

// Virtual untuk check apakah grup masih bisa menambah anggota
groupSchema.virtual('canAddMembers').get(function() {
  return this.memberCount < this.maxMembers;
});

// Virtual untuk mendapatkan daftar anggota tanpa leader
groupSchema.virtual('regularMembers').get(function() {
  if (!this.members) return [];
  return this.members.filter(member => member.role === 'member');
});

// Middleware untuk validasi sebelum save
groupSchema.pre('save', function(next) {
  // Pastikan hanya ada satu leader
  const leaders = this.members.filter(member => member.role === 'leader');
  if (leaders.length > 1) {
    return next(new Error('Grup hanya boleh memiliki satu leader'));
  }
  
  // Pastikan tidak melebihi batas maksimal anggota
  if (this.members.length > this.maxMembers) {
    return next(new Error(`Jumlah anggota tidak boleh melebihi ${this.maxMembers}`));
  }
  
  // Pastikan minimal ada 2 anggota
  if (this.members.length < 2 && this.isActive) {
    return next(new Error('Grup minimal harus memiliki 2 anggota'));
  }
  
  next();
});

// Middleware untuk populate members dan advisor
groupSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'members.user',
    select: 'firstName lastName email studentId role'
  }).populate({
    path: 'advisor',
    select: 'firstName lastName email employeeId department'
  });
  next();
});

// Instance method untuk menambah anggota
groupSchema.methods.addMember = function(userId, role = 'member') {
  // Check apakah user sudah menjadi anggota
  const existingMember = this.members.find(
    member => member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    throw new Error('User sudah menjadi anggota grup ini');
  }
  
  // Check apakah masih bisa menambah anggota
  if (!this.canAddMembers) {
    throw new Error('Grup sudah mencapai batas maksimal anggota');
  }
  
  // Jika role leader, pastikan belum ada leader
  if (role === 'leader') {
    const hasLeader = this.members.some(member => member.role === 'leader');
    if (hasLeader) {
      throw new Error('Grup sudah memiliki leader');
    }
  }
  
  this.members.push({
    user: userId,
    role: role,
    joinedAt: new Date()
  });
  
  return this.save();
};

// Instance method untuk menghapus anggota
groupSchema.methods.removeMember = function(userId) {
  const memberIndex = this.members.findIndex(
    member => member.user.toString() === userId.toString()
  );
  
  if (memberIndex === -1) {
    throw new Error('User bukan anggota grup ini');
  }
  
  // Jika yang dihapus adalah leader, pilih leader baru
  const removedMember = this.members[memberIndex];
  this.members.splice(memberIndex, 1);
  
  if (removedMember.role === 'leader' && this.members.length > 0) {
    // Jadikan anggota pertama sebagai leader baru
    this.members[0].role = 'leader';
  }
  
  return this.save();
};

// Instance method untuk mengubah leader
groupSchema.methods.changeLeader = function(newLeaderId) {
  // Reset semua role ke member
  this.members.forEach(member => {
    member.role = 'member';
  });
  
  // Set leader baru
  const newLeader = this.members.find(
    member => member.user.toString() === newLeaderId.toString()
  );
  
  if (!newLeader) {
    throw new Error('User bukan anggota grup ini');
  }
  
  newLeader.role = 'leader';
  return this.save();
};

// Static method untuk find grup berdasarkan user
groupSchema.statics.findByUser = function(userId) {
  return this.find({
    'members.user': userId,
    isActive: true
  });
};

// Static method untuk find grup berdasarkan advisor
groupSchema.statics.findByAdvisor = function(advisorId) {
  return this.find({
    advisor: advisorId,
    isActive: true
  });
};

module.exports = mongoose.model('Group', groupSchema);