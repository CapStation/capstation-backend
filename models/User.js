const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email harus diisi'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Format email tidak valid']
  },
  password: {
    type: String,
    required: [true, 'Password harus diisi'],
    minlength: [8, 'Password minimal 8 karakter']
  },
  firstName: {
    type: String,
    required: [true, 'Nama depan harus diisi'],
    trim: true,
    maxlength: [50, 'Nama depan tidak boleh lebih dari 50 karakter']
  },
  lastName: {
    type: String,
    required: [true, 'Nama belakang harus diisi'],
    trim: true,
    maxlength: [50, 'Nama belakang tidak boleh lebih dari 50 karakter']
  },
  studentId: {
    type: String,
    sparse: true, // Allows multiple null values, but unique if present
    trim: true,
    match: [/^\d{8,12}$/, 'NIM harus berupa angka 8-12 digit']
  },
  employeeId: {
    type: String,
    sparse: true,
    trim: true,
    match: [/^\d{6,10}$/, 'NIP harus berupa angka 6-10 digit']
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'dosen', 'mahasiswa_pemilik', 'mahasiswa_peserta'],
      message: 'Role tidak valid'
    },
    required: [true, 'Role harus dipilih']
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'Nama jurusan tidak boleh lebih dari 100 karakter']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[+]?[0-9\-\s]{10,15}$/, 'Format nomor telepon tidak valid']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Index untuk optimasi query
userSchema.index({ role: 1 });

// Virtual untuk mendapatkan nama lengkap
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual untuk check apakah user adalah mahasiswa
userSchema.virtual('isStudent').get(function() {
  return this.role === 'mahasiswa_pemilik' || this.role === 'mahasiswa_peserta';
});

// Virtual untuk check apakah user adalah dosen
userSchema.virtual('isLecturer').get(function() {
  return this.role === 'dosen';
});

// Virtual untuk check apakah user adalah admin
userSchema.virtual('isAdmin').get(function() {
  return this.role === 'admin';
});

// Middleware untuk hash password sebelum save
userSchema.pre('save', async function(next) {
  // Only hash password if it's been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method untuk verifikasi password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method untuk generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  
  // Generate token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash token and save to database
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set expire time (10 minutes)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
  // Return unhashed token
  return resetToken;
};

// Instance method untuk generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  
  // Generate token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  // Hash token and save to database
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  // Return unhashed token
  return verificationToken;
};

// Static method untuk validasi role combinations
userSchema.statics.validateRoleData = function(userData) {
  const { role, studentId, employeeId } = userData;
  
  if (role === 'mahasiswa_pemilik' || role === 'mahasiswa_peserta') {
    if (!studentId) {
      throw new Error('NIM diperlukan untuk mahasiswa');
    }
    if (employeeId) {
      throw new Error('Mahasiswa tidak boleh memiliki NIP');
    }
  }
  
  if (role === 'dosen' || role === 'admin') {
    if (!employeeId) {
      throw new Error('NIP diperlukan untuk dosen dan admin');
    }
    if (studentId) {
      throw new Error('Dosen dan admin tidak boleh memiliki NIM');
    }
  }
  
  return true;
};

module.exports = mongoose.model('User', userSchema);