const Store = require('../models/store');

function enrichRequests(data, expandOrEmbed) {
  const expand = String(expandOrEmbed || '').toLowerCase();
  return data.map(r => {
    const cap = Store.capstones.find(c => c.id === r.capstoneId);
    if (expand === 'capstone') {
      return {
        ...r,
        capstone: cap ? {
          id: cap.id, judul: cap.judul, kategori: cap.kategori,
          pemilikId: cap.pemilikId, status: cap.status
        } : null
      };
    }
    return {
      ...r,
      capstonePemilikId: cap ? cap.pemilikId : null,
      capstoneJudul: cap ? cap.judul : null
    };
  });
}

// Ajukan request kelanjutan.
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

// List request.
// Filter: status, capstoneId, decider=me, decidedByUser, decidedByRole, onlyOwned=true, expand=capstone | embed=capstone
exports.listRequests = (req, res) => {
  const { capstoneId, status, expand, decidedByRole, decidedByUser, decider, onlyOwned, embed } = req.query;

  let data = Store.requests.slice();
  if (capstoneId) data = data.filter(r => r.capstoneId === capstoneId);
  if (status) data = data.filter(r => r.status === status);

  if (decidedByRole) data = data.filter(r => r.decidedByRole === decidedByRole);
  if (decidedByUser) data = data.filter(r => r.decidedByUser === decidedByUser);
  if (String(decider).toLowerCase() === 'me') {
    data = data.filter(r => r.decidedByUser === req.user.id);
  }

  if (String(onlyOwned).toLowerCase() === 'true') {
    data = data.filter(r => {
      const cap = Store.capstones.find(c => c.id === r.capstoneId);
      return cap && cap.pemilikId === req.user.id;
    });
  }

  const out = enrichRequests(data, expand || embed);
  return res.json({ count: out.length, data: out });
};

// Putuskan request oleh dosen atau pemilik.
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
    capstoneJudul: capstone.judul
  });
};

// Alias rapi: keputusan yang saya buat.
exports.listMyDecisions = (req, res) => {
  const status = req.query.status;
  const expandOrEmbed = req.query.expand || req.query.embed;
  let data = Store.requests.filter(r => r.decidedByUser === req.user.id);
  if (status) data = data.filter(r => r.status === status);
  const out = enrichRequests(data, expandOrEmbed);
  res.json({ count: out.length, data: out });
};

// Alias rapi: semua request untuk capstone milik saya. Khusus pemilik.
exports.listOwnedRequests = (req, res) => {
  if (req.user.role !== 'pemilik') {
    return res.status(403).json({ error: 'Hanya pemilik yang boleh mengakses' });
  }
  const status = req.query.status;
  const expandOrEmbed = req.query.expand || req.query.embed;

  const ownedIds = Store.capstones
    .filter(c => c.pemilikId === req.user.id)
    .map(c => c.id);

  let data = Store.requests.filter(r => ownedIds.includes(r.capstoneId));
  if (status) data = data.filter(r => r.status === status);

  const out = enrichRequests(data, expandOrEmbed);
  res.json({ count: out.length, data: out });
};
