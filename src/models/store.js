const { randomUUID } = require('crypto');

const CAPSTONE_STATUS = {
  BISA_DILANJUTKAN: 'Bisa dilanjutkan',
  SELESAI: 'Selesai',
  DALAM_PROSES: 'Dalam proses'
};

let capstones = [
  { id: 'c1', judul: 'AI Klasifikasi Daun', kategori: 'AI', tahun: 2024, pemilikId: 'owner1', status: CAPSTONE_STATUS.BISA_DILANJUTKAN },
  { id: 'c2', judul: 'Sistem Rekomendasi Wisata', kategori: 'Web', tahun: 2024, pemilikId: 'owner2', status: CAPSTONE_STATUS.SELESAI },
  { id: 'c3', judul: 'IoT Kebun Pintar', kategori: 'IoT', tahun: 2023, pemilikId: 'owner3', status: CAPSTONE_STATUS.BISA_DILANJUTKAN }
];

let requests = [];

function addRequest({ capstoneId, groupName, tahunPengajuan, pemohonId }) {
  const req = {
    id: randomUUID(),
    capstoneId,
    groupName,
    tahunPengajuan,
    pemohonId,
    status: 'pending',
    decidedByRole: null,
    decidedByUser: null,
    decidedAt: null
  };
  requests.push(req);
  return req;
}

function decideRequest(id, decision, actor) {
  const req = requests.find(r => r.id === id);
  if (!req) return null;
  req.status = decision === 'accept' ? 'accepted' : 'rejected';
  req.decidedByRole = actor.role;
  req.decidedByUser = actor.id;
  req.decidedAt = new Date().toISOString();
  return req;
}

module.exports = {
  CAPSTONE_STATUS,
  capstones,
  requests,
  addRequest,
  decideRequest
};
