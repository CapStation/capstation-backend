const Store = require('../models/store');

exports.listCapstones = (req, res) => {
  const { status, kategori } = req.query;
  let data = Store.capstones;

  if (!status) {
    data = data.filter(c => c.status === Store.CAPSTONE_STATUS.BISA_DILANJUTKAN);
  } else {
    data = data.filter(c => c.status.toLowerCase() === String(status).toLowerCase());
  }

  if (kategori) {
    data = data.filter(c => c.kategori.toLowerCase() === String(kategori).toLowerCase());
  }

  res.json({ count: data.length, data });
};

exports.createRequest = (req, res) => {
  // Guard aman saat body undefined
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Body kosong. Kirim JSON dengan Content-Type application/json' });
  }

  const { capstoneId, groupName, tahunPengajuan } = req.body;

  if (!capstoneId || !groupName || !tahunPengajuan) {
    return res.status(400).json({ error: 'capstoneId, groupName, tahunPengajuan wajib' });
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
    tahunPengajuan: Number(tahunPengajuan),
    pemohonId: req.user.id
  });

  res.status(201).json(reqObj);
};

exports.listRequests = (req, res) => {
  const { capstoneId, status } = req.query;
  let data = Store.requests;
  if (capstoneId) data = data.filter(r => r.capstoneId === capstoneId);
  if (status) data = data.filter(r => r.status === status);
  res.json({ count: data.length, data });
};

exports.decideRequest = (req, res) => {
  const { id } = req.params;

  // baca aman. Boleh juga lewat query kalau perlu.
  const decisionFromBody = req.body && req.body.decision;
  const decision = decisionFromBody || req.query.decision;

  if (!decision) {
    return res.status(400).json({ error: "Kirim decision di body JSON atau query. Nilai: 'accept' atau 'reject'." });
  }
  if (!['accept', 'reject'].includes(decision)) {
    return res.status(400).json({ error: "decision harus 'accept' atau 'reject'" });
  }

  if (!['dosen', 'pemilik'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Hanya dosen atau pemilik yang boleh memutuskan' });
  }

  const updated = Store.decideRequest(id, decision, req.user);
  if (!updated) return res.status(404).json({ error: 'Request tidak ditemukan' });

  res.json(updated);
};

