const mongoose = require('mongoose');
const { getThemeCategories } = require('../configs/themes');
const Schema = mongoose.Schema;

const capstoneSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  category: { 
    type: String, 
    enum: {
      values: getThemeCategories().map(theme => theme.label),
      message: `Kategori harus salah satu dari: ${getThemeCategories().map(theme => theme.label).join(', ')}`
    },
    required: true 
  }, 
  year: Number, 
  status: { 
    type: String, 
    enum: ['Menunggu','Bisa dilanjutkan','Ditutup'], 
    default: 'Menunggu' 
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // pemilik proyek (mahasiswa)
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true });

module.exports = mongoose.model('Capstone', capstoneSchema);
