const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupSchema = new Schema({
  name: { 
    type: String, 
    required: [true, 'Nama grup harus diisi'],
    trim: true,
    minlength: [3, 'Nama grup minimal 3 karakter'],
    maxlength: [100, 'Nama grup maksimal 100 karakter']
  },
  description: { 
    type: String, 
    trim: true,
    maxlength: [500, 'Deskripsi maksimal 500 karakter'],
    default: ''
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
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  maxMembers: {
    type: Number,
    default: 2,
    min: 2,
    max: 5
  },
  invitations: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    sentAt: { type: Date, default: Date.now }
  }],
  joinRequests: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    requestedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Virtual untuk get members count
groupSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Ensure virtuals are serialized
groupSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Group', groupSchema);
