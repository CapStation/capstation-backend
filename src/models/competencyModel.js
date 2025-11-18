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
      'Software Development',
      'Web & Mobile Application',
      'Embedded Systems',
      'IoT (Internet of Things)',
      'Robotics & Automation',
      'Signal Processing',
      'Computer Vision',
      'Machine Learning / AI',
      'Biomedical Devices',
      'Health Informatics',
      'Networking & Security',
      'Cloud & DevOps',
      'Data Engineering & Analytics',
      'Human-Computer Interaction',
      'Control Systems',
      'Energy & Power Systems',
      'Research & Simulation',
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
