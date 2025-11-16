const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const announcementSchema = new Schema({
  title: { 
    type: String, 
    required: [true, 'Judul pengumuman harus diisi'],
    trim: true,
    minlength: [3, 'Judul minimal 3 karakter'],
    maxlength: [200, 'Judul maksimal 200 karakter']
  },
  content: { 
    type: String, 
    required: [true, 'Konten pengumuman harus diisi'],
    minlength: [10, 'Konten minimal 10 karakter']
  },
  category: {
    type: String,
    enum: ['akademik', 'pengumuman', 'peringatan', 'informasi', 'lainnya'],
    default: 'pengumuman'
  },
  targetAudience: {
    type: String,
    enum: ['semua', 'mahasiswa', 'dosen', 'admin'],
    default: 'semua'
  },
  status: {
    type: String,
    enum: ['published', 'draft'],
    default: 'published'
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'Pembuat pengumuman harus ditentukan']
  },
  isImportant: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  },
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
