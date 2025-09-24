const Store = require('../models/store');

function enrichRequests(data, expandOrEmbed) {
  const expand = String(expandOrEmbed || '').toLowerCase();
  return data.map(r => {
    const cap = Store.capstones.find(c => c.id === r.capstoneId);
    if (expand === 'capstone') {
      return {
        ...r,
        capstone: cap ? {
          id: cap.id,
          judul: cap.judul,
          kategori: cap.kategori,
          pemilikId: cap.pemilikId,
          status: cap.status
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

// POST /api/requests
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

// GET /api/requests
// Filter: status, capstoneId, decider=me, decidedByUser, decidedByRole, onlyOwned=true, expand|embed=capstone
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

// PATCH /api/requests/:id/decide
exports.decideRequest = (req, res) => {
  const { id } = req.params;
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  const decision = body.decision || req.query.decision;
  const override = String(body.override ?? req.query.override ?? 'false').toLowerCase() === 'true';
  const reason = body.reason || req.query.reason || null;
  const includeHistory = String(req.query.history || 'false').toLowerCase() === 'true';

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

  const capstone = Store.capstones.find(c => c.id === reqObj.capstoneId);
  if (!capstone) return res.status(404).json({ error: 'Capstone terkait tidak ditemukan' });

  if (req.user.role === 'pemilik' && capstone.pemilikId !== req.user.id) {
    return res.status(403).json({ error: 'Anda bukan pemilik capstone ini, tidak boleh memutuskan' });
  }

  if (reqObj.status !== 'pending' && !override) {
    return res.status(409).json({
      error: 'Request sudah diputuskan. Gunakan override=true untuk mengubah keputusan',
      currentStatus: reqObj.status,
      example: { decision: 'accept', override: true, reason: 'Revisi setelah rapat' }
    });
  }

  // KIRIMKAN reason ke store
  const updated = Store.decideRequest(id, decision, req.user, reason);

  const response = {
    ...updated,
    capstonePemilikId: capstone.pemilikId,
    capstoneJudul: capstone.judul
  };
  if (!includeHistory) delete response.history;

  return res.json(response);
};

// GET /api/requests/:id/history
exports.getRequestHistory = (req, res) => {
  const { id } = req.params;
  const r = Store.requests.find(x => x.id === id);
  if (!r) return res.status(404).json({ error: 'Request tidak ditemukan' });
  return res.json({ id: r.id, history: Array.isArray(r.history) ? r.history : [] });
};

// GET /api/me/decisions?status=...
exports.listMyDecisions = (req, res) => {
  req.query.decider = 'me';
  return exports.listRequests(req, res);
};

// GET /api/me/owner/requests?embed=capstone
exports.listOwnedRequests = (req, res) => {
  if (req.user.role !== 'pemilik') {
    return res.status(403).json({ error: 'Hanya pemilik yang boleh mengakses' });
  }
  req.query.onlyOwned = 'true';
  return exports.listRequests(req, res);
};
