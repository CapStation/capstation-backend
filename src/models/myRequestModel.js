const mongoose = require('mongoose');
const { Schema } = mongoose;

const historySchema = new Schema({
  from:   { type: String, enum: ['pending','accepted','rejected'], required: true },
  to:     { type: String, enum: ['pending','accepted','rejected'], required: true },
  byRole: { type: String, enum: ['dosen','pemilik'], required: true },
  byUser: { type: String, required: true },
  reason: { type: String, default: null },
  at:     { type: Date, required: true }
}, { _id: false });

const myRequestSchema = new Schema({
  capstoneId:     { type: Schema.Types.ObjectId, ref: 'CapstoneMy', required: true },
  groupName:      { type: String, required: true },
  tahunPengajuan: { type: Number, required: true },
  pemohonId:      { type: String, required: true },
  status:         { type: String, enum: ['pending','accepted','rejected'], default: 'pending' },
  reason:         { type: String, default: null },
  decidedByRole:  { type: String, enum: ['dosen','pemilik', null], default: null },
  decidedByUser:  { type: String, default: null },
  decidedAt:      { type: Date, default: null },
  history:        { type: [historySchema], default: [] }
}, { timestamps: true, collection: 'requests' });

myRequestSchema.index({ capstoneId: 1, groupName: 1, tahunPengajuan: 1 }, { unique: true });

module.exports = mongoose.model('CapstoneRequest', myRequestSchema);
