const Store = require('../models/store');

// Ajukan request kelanjutan
exports.createRequest = (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { capstoneId, groupName, tahunPengajuan } = body;

  if (!capstoneId || !groupName || !tahunPengajuan) {
    return res.status(400).json({
      error: 'Beberapa field wajib belum diisi',
      requiredFields: ['capstoneId', 'groupName', 'tahunPengajuan'],
      example: { capstoneId: 'c1', groupName: 'Nama Kelompok', tahunPengajuan: 2025 }
    });
  }

  const cap = Store.capstones.find(c => c.id === capstoneId);
  if (!cap) return res.status(404).json({ error: 'Capstone tidak ditemukan' });
  if (cap.status !== Store.CAPSTONE_STATUS.BISA_DILANJUTKAN) {
    return res.status(400).json({ error: 'Capstone tidak berstatus Bisa dilanjutkan' });
  }

  const dup = Store.requests.find(r =>
    r.capstoneId === capstoneId &&
    r.groupName === groupName &&
    Number(r.tahunPengajuan) === Number(tahunPengajuan)
  );
  if (dup) return res.status(409).json({ error: 'Request sudah ada' });

  const reqObj = Store.addRequest({
    capstoneId,
    groupName,
    tahunPengajuan,
    pemohonId: req.user.id
  });

  return res.status(201).json(reqObj);
};

// Lihat semua request
// Tambahan: ?expand=capstone untuk dapat objek capstone lengkap
exports.listRequests = (req, res) => {
  const { capstoneId, status, expand } = req.query;

  let data = Store.requests;
  if (capstoneId) data = data.filter(r => r.capstoneId === capstoneId);
  if (status) data = data.filter(r => r.status === status);

  const enriched = data.map(r => {
    const cap = Store.capstones.find(c => c.id === r.capstoneId);
    if (String(expand).toLowerCase() === 'capstone') {
      return {
        ...r,
        capstone: cap
          ? {
              id: cap.id,
              judul: cap.judul,
              kategori: cap.kategori,
              pemilikId: cap.pemilikId,
              status: cap.status,
            }
          : null,
      };
    }
    return {
      ...r,
      capstonePemilikId: cap ? cap.pemilikId : null,
      capstoneJudul: cap ? cap.judul : null,
    };
  });

  return res.json({ count: enriched.length, data: enriched });
};

// Putuskan request oleh dosen atau pemilik
exports.decideRequest = (req, res) => {
  const { id } = req.params;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const decision = body.decision || req.query.decision;

  if (!decision) {
    return res.status(400).json({
      error: 'Field decision wajib diisi',
      allowed: ['accept', 'reject'],
      example: { decision: 'accept' }
    });
  }
  if (!['accept', 'reject'].includes(decision)) {
    return res.status(400).json({ error: "decision harus 'accept' atau 'reject'" });
  }
  if (!['dosen', 'pemilik'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Hanya dosen atau pemilik yang boleh memutuskan' });
  }

  const reqObj = Store.requests.find(r => r.id === id);
  if (!reqObj) return res.status(404).json({ error: 'Request tidak ditemukan' });

  // Validasi pemilik. Dosen bebas.
  const capstone = Store.capstones.find(c => c.id === reqObj.capstoneId);
  if (!capstone) return res.status(404).json({ error: 'Capstone terkait tidak ditemukan' });

  if (req.user.role === 'pemilik' && capstone.pemilikId !== req.user.id) {
    return res.status(403).json({ error: 'Anda bukan pemilik capstone ini, tidak boleh memutuskan' });
  }

  const updated = Store.decideRequest(id, decision, req.user);

  return res.json({
    ...updated,
    capstonePemilikId: capstone.pemilikId,
    capstoneJudul: capstone.judul,
  });
};
