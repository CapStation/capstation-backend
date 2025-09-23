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

  res.status(201).json(reqObj);
};

// Lihat semua request
exports.listRequests = (req, res) => {
  const { capstoneId, status } = req.query;
  let data = Store.requests;
  if (capstoneId) data = data.filter(r => r.capstoneId === capstoneId);
  if (status) data = data.filter(r => r.status === status);
  res.json({ count: data.length, data });
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

  // Pemilik hanya untuk capstone miliknya
  if (req.user.role === 'pemilik') {
    const capstone = Store.capstones.find(c => c.id === reqObj.capstoneId);
    if (!capstone) return res.status(404).json({ error: 'Capstone terkait tidak ditemukan' });
    if (capstone.pemilikId !== req.user.id) {
      return res.status(403).json({ error: 'Anda bukan pemilik capstone ini, tidak boleh memutuskan' });
    }
  }

  const updated = Store.decideRequest(id, decision, req.user);
  res.json(updated);
};
