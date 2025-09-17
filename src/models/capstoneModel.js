const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const capstoneSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  category: { 
    type: String, 
    enum: ['Kesehatan', 'Pengelolaan Sampah', 'Smart City', 'Transportasi Ramah Lingkungan'],
    required: true 
  }, 
  year: Number, 
  status: { 
    type: String, 
    enum: ['Bisa dilanjutkan','Ditutup'], 
    default: 'Bisa dilanjutkan' 
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // pemilik proyek (mahasiswa)
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true });

module.exports = mongoose.model('Capstone', capstoneSchema);
