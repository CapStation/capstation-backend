const mongoose = require('mongoose');

const competencySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Programming Languages',
      'Web Development', 
      'Mobile Development',
      'Data Science',
      'UI/UX Design',
      'DevOps',
      'Database',
      'Cloud Computing',
      'Artificial Intelligence',
      'Cybersecurity',
      'Project Management',
      'Soft Skills',
      'Others'
    ]
  },
  description: {
    type: String,
    maxlength: 200
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { 
  timestamps: true 
});

// Index untuk pencarian (name sudah di-index otomatis karena unique: true)
competencySchema.index({ category: 1 });
competencySchema.index({ isActive: 1 });

module.exports = mongoose.model('Competency', competencySchema);
