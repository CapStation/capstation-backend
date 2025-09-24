const mongoose = require('mongoose');
const { Schema } = mongoose;

const myCapstoneSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  category: {
    type: String,
    enum: [
      'Kesehatan',
      'Pengelolaan Sampah',
      'Smart City',
      'Transportasi Ramah Lingkungan'
    ],
    required: true
  },
  year: Number,
  status: {
    type: String,
    enum: ['Menunggu', 'Bisa dilanjutkan', 'Ditutup'],
    default: 'Menunggu'
  },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true, collection: 'capstones' });

module.exports = mongoose.model('CapstoneMy', myCapstoneSchema);
