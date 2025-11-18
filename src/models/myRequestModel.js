const mongoose = require('mongoose');
const { Schema } = mongoose;

const historySchema = new Schema(
  {
    from:   { type: String, enum: ['pending', 'accepted', 'rejected', 'cancelled'], required: true },
    to:     { type: String, enum: ['pending', 'accepted', 'rejected', 'cancelled'], required: true },

    // pemilik = owner project
    // system  = auto reject atau cancel sistem
    byRole: { type: String, enum: ['pemilik', 'system'], required: true },

    byUser: { type: String, default: null },
    reason: { type: String, default: null },

    at:     { type: Date, required: true }
  },
  { _id: false }
);

const myRequestSchema = new Schema(
  {
    // ===== PROJECT YANG DIMINTA (PROJECT ASLI) =====
    capstoneId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Project', 
      required: true 
    },

    // ===== PROJECT BARU MAHASISWA =====
    // Project yang otomatis dibuat saat request dengan status pending
    newProjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: false
    },

    // ===== GRUP PENGAJU =====
    group: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true
    },

    groupName: { 
      type: String, 
      required: true 
    },
    // Mendukung format lama (Number: 2024) dan format baru (String: "Gasal-2024")
    tahunPengajuan: { 
      type: Schema.Types.Mixed, 
      required: true 
    },
    namaDosenPembimbing: { 
      type: String, 
      required: true 
    },

    // ===== PEMOHON (KETUA GRUP) =====
    pemohonId: { 
      type: String, 
      required: true 
    },

    // ===== STATUS REQUEST =====
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending'
    },

    reason:        { type: String, default: null },
    decidedByRole: { type: String, enum: ['pemilik', 'system', null], default: null },
    decidedByUser: { type: String, default: null },
    decidedAt:     { type: Date, default: null },

    // ===== HISTORY KEPUTUSAN =====
    history:       { type: [historySchema], default: [] }
  },
  { timestamps: true, collection: 'requests' }
);

// Satu grup cuma boleh punya request non-cancelled 1x ke project-tahun yang sama
myRequestSchema.index(
  { capstoneId: 1, group: 1, tahunPengajuan: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $ne: 'cancelled' } }
  }
);


module.exports = mongoose.model('CapstoneRequest', myRequestSchema);
