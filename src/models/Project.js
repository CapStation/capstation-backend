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
  
  tema: {
    type: String,
    required: [true, 'Tema project harus dipilih'],
    enum: {
      values: getValidThemesDash(),
      message: `Tema harus salah satu dari: ${getValidThemesDash().join(', ')}`
    },
    index: true
  },
  
  status: {
    type: String,
    enum: ['inactive', 'active', 'selesai', 'dapat_dilanjutkan'],
    default: 'active'
  },
  
  capstoneStatus: {
    type: String,
    enum: ['new', 'pending', 'accepted', 'rejected'],
    default: 'new',
    required: [true, 'Status capstone harus diisi']
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
    ref: 'Group',
    required: [true, 'Group project harus ada']
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Supervisor (dosen pembimbing) harus ada'],
    validate: {
      validator: async function(supervisorId) {
        const User = mongoose.model('User');
        const supervisor = await User.findById(supervisorId);
        return supervisor && supervisor.role === 'dosen';
      },
      message: 'Supervisor harus seorang dosen'
    }
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  
  // Continuation requests for project handover
  continuationRequests: [{
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    requestDate: { type: Date, default: Date.now },
    responseDate: Date,
    notes: String
  }],
  
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: {
    currentTime: () => {
      const now = new Date();
      const jakartaOffset = 7 * 60;
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      return new Date(utc + (jakartaOffset * 60000));
    }
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

projectSchema.index({ tema: 1, status: 1 });
projectSchema.index({ academicYear: 1, status: 1 });
projectSchema.index({ tema: 1, academicYear: 1 });
projectSchema.index({ academicYear: 1 });
projectSchema.index({ owner: 1 });
projectSchema.index({ title: 'text', description: 'text' });

projectSchema.virtual('documentCount').get(function() {
  return this.documents ? this.documents.length : 0;
});

// Middleware untuk update timestamp dan auto-assign group data
projectSchema.pre('save', async function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  
  // Auto-assign group owner dan members jika group sudah dipilih (ONLY for NEW projects)
  if (this.group && this.isNew) {
    try {
      const Group = mongoose.model('Group');
      const group = await Group.findById(this.group);
      
      if (group) {
        // Set owner dari group owner
        this.owner = group.owner;
        this.members = [...group.members];
        
        // Add project reference ke group WITHOUT triggering save middleware
        if (!group.projects.includes(this._id)) {
          await Group.updateOne(
            { _id: group._id },
            { $addToSet: { projects: this._id } }
          );
        }
      }
    } catch (error) {
      return next(error);
    }
  }
  
  // Ensure owner is always included in members
  if (this.owner && this.members) {
    const ownerIdString = this.owner.toString();
    const memberIdStrings = this.members.map(m => m.toString());
    if (!memberIdStrings.includes(ownerIdString)) {
      this.members.push(this.owner);
    }
  }
  
  next();
});

module.exports = mongoose.model('Project', projectSchema);