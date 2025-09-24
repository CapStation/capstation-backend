const { randomUUID } = require('crypto');

const CAPSTONE_STATUS = {
  BISA_DILANJUTKAN: 'Bisa dilanjutkan',
  SELESAI: 'Selesai',
  DALAM_PROSES: 'Dalam proses'
};

const CATEGORIES = [
  'Kesehatan',
  'Pengelolaan Sampah',
  'Smart City',
  'Transportasi Ramah Lingkungan'
];

// 7 dummy capstones
let capstones = [
  { id: 'c1', judul: 'Sistem Monitoring Kesehatan Posyandu', kategori: 'Kesehatan', tahun: 2024, pemilikId: 'owner1', status: CAPSTONE_STATUS.BISA_DILANJUTKAN },
  { id: 'c2', judul: 'Aplikasi Pemilahan Sampah Pintar',     kategori: 'Pengelolaan Sampah', tahun: 2024, pemilikId: 'owner2', status: CAPSTONE_STATUS.SELESAI },
  { id: 'c3', judul: 'Dashboard Lalu Lintas Kota',            kategori: 'Smart City', tahun: 2023, pemilikId: 'owner3', status: CAPSTONE_STATUS.BISA_DILANJUTKAN },
  { id: 'c4', judul: 'Bike Sharing Kampus',                   kategori: 'Transportasi Ramah Lingkungan', tahun: 2025, pemilikId: 'owner4', status: CAPSTONE_STATUS.DALAM_PROSES },
  { id: 'c5', judul: 'Telemedicine Desa',                     kategori: 'Kesehatan', tahun: 2025, pemilikId: 'owner1', status: CAPSTONE_STATUS.BISA_DILANJUTKAN },
  { id: 'c6', judul: 'IoT Tempat Sampah Pintar',              kategori: 'Pengelolaan Sampah', tahun: 2023, pemilikId: 'owner2', status: CAPSTONE_STATUS.BISA_DILANJUTKAN },
  { id: 'c7', judul: 'Peta Lampu Jalan Hemat Energi',         kategori: 'Smart City', tahun: 2024, pemilikId: 'owner3', status: CAPSTONE_STATUS.SELESAI }
];

// Requests in memory
let requests = []; // { id, capstoneId, groupName, tahunPengajuan, pemohonId, status, decidedByRole, decidedByUser, decidedAt }

function addRequest({ capstoneId, groupName, tahunPengajuan, pemohonId }) {
  const req = {
    id: randomUUID(),
    capstoneId,
    groupName,
    tahunPengajuan: Number(tahunPengajuan),
    pemohonId,
    status: 'pending',
    reason: null, // NEW
    decidedByRole: null,
    decidedByUser: null,
    decidedAt: null,
    history: [] // NEW
  };
  requests.push(req);
  return req;
}

// NEW: reason optional
function decideRequest(id, decision, actor, reason) {
  const req = requests.find(r => r.id === id);
  if (!req) return null;

  const prev = req.status;
  const next = decision === 'accept' ? 'accepted' : 'rejected';

  // normalisasi reason
  const parsedReason =
    typeof reason === 'string' && reason.trim() ? reason.trim() : null;

  // update current state
  req.status = next;
  req.reason = parsedReason;           // <-- WAJIB. inilah yang hilang tadi
  req.decidedByRole = actor.role;
  req.decidedByUser = actor.id;
  req.decidedAt = new Date().toISOString();

  // audit trail
  if (!Array.isArray(req.history)) req.history = [];
  req.history.push({
    from: prev,
    to: next,
    byRole: actor.role,
    byUser: actor.id,
    reason: parsedReason,              // simpan reason di history juga
    at: req.decidedAt
  });

  return req;
}

module.exports = {
  CAPSTONE_STATUS,
  CATEGORIES,
  capstones,
  requests,
  addRequest,
  decideRequest
};