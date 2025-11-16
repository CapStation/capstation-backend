const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupSchema = new Schema({
  name: { 
    type: String, 
    required: [true, 'Nama grup harus diisi'],
    trim: true,
    maxlength: [100, 'Nama grup tidak boleh lebih dari 100 karakter']
  },
  description: {
    type: String,
    maxlength: [500, 'Deskripsi tidak boleh lebih dari 500 karakter'],
    trim: true
  },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'Owner grup harus ditentukan']
  },
  members: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  // Projects yang dibuat oleh grup ini
  projects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

groupSchema.virtual('memberCount').get(function() {
  return this.members ? this.members.length : 0;
});
groupSchema.virtual('projectCount').get(function() {
  return this.projects ? this.projects.length : 0;
});

groupSchema.index({ owner: 1 });
groupSchema.index({ isActive: 1 });

// Middleware untuk memastikan owner ada di members
groupSchema.pre('save', function(next) {
  if (!this.members.includes(this.owner)) {
    this.members.unshift(this.owner); // Add owner di posisi pertama
  }
  next();
});

// Post-save middleware to sync members to projects
groupSchema.post('save', async function(doc) {
  try {
    // Only sync if members field was actually modified
    if (this.isModified && this.isModified('members')) {
      const Project = mongoose.model('Project');
      const result = await Project.updateMany(
        { group: doc._id },
        { $set: { members: doc.members } }
      );
      console.log(`✅ Synced ${doc.members.length} members to ${result.modifiedCount} projects in group ${doc.name}`);
    }
  } catch (error) {
    console.error('❌ Error syncing members to projects:', error);
  }
  // No next() needed for post middleware
});

// Method check apakah user adalah member
groupSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.toString() === userId.toString());
};

// Method check apakah user adalah owner
groupSchema.methods.isOwner = function(userId) {
  return this.owner.toString() === userId.toString();
};

module.exports = mongoose.model('Group', groupSchema);
