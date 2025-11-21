// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true, lowercase: true },
//   passwordHash: { type: String, required: true },
//   role: { type: String, enum: ['mahasiswa','dosen','admin'], default: 'mahasiswa' },
//   isVerified: { type: Boolean, default: false },
//   resetToken: { token: String, expiresAt: Date },
//   createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model('User', userSchema);

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String },
    role: {
      type: String,
      enum: ["mahasiswa", "dosen", "admin"],
      default: null,
    },
    pendingRole: {
      type: String,
      enum: ["mahasiswa", "dosen", "admin"],
      default: null,
    },
    roleApproved: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    oauthProvider: { type: String },
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },
    verifyToken: { type: String, default: null },
    verifyTokenExpires: { type: Date, default: null },
    competencies: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Competency",
        },
      ],
      validate: {
        validator: function (arr) {
          return arr.length <= 20;
        },
        message: "Maksimal 20 kompetensi yang dapat ditambahkan",
      },
    },
  },
  { timestamps: true }
);

userSchema.index({ competencies: 1 });

module.exports = mongoose.model("User", userSchema);
