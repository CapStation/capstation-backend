const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['mahasiswa','dosen','admin'], default: 'mahasiswa' },
  isVerified: { type: Boolean, default: false },
  resetToken: { token: String, expiresAt: Date },
  
  competencies: [{
    type: mongoose.Schema.Types.ObjectId, ref: 'Competency',
    validate: {
      validator: function(arr) {
        return arr.length <= 20;
      },
      message: 'Maksimal 20 kompetensi yang dapat ditambahkan'
    }
  }],
  
  createdAt: { type: Date, default: Date.now }
});

userSchema.index({ competencies: 1 });

module.exports = mongoose.model('User', userSchema);
