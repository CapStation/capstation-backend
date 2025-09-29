const Project = require('../models/Project');
const Request  = require('../models/myRequestModel');

function shape(r, cap, embed) {
  const base = {
    id: String(r._id),
    capstoneId: String(r.capstoneId),
    groupName: r.groupName,
    tahunPengajuan: r.tahunPengajuan,
    pemohonId: r.pemohonId,
    status: r.status,
    reason: r.reason || null,
    decidedByRole: r.decidedByRole || null,
    decidedByUser: r.decidedByUser || null,
    decidedAt: r.decidedAt || null
  };
  if (cap && embed) {
    base.capstone = {
      id: String(cap._id),
      judul: cap.title,
      kategori: cap.tema, // tema from Project model
      pemilikId: String(cap.owner),
      status: cap.capstoneStatus // capstoneStatus from Project model
    };
  } else if (cap) {
    base.capstonePemilikId = String(cap.owner);
    base.capstoneJudul = cap.title;
  }
  return base;
}

// helper
const lower = (v) => String(v || '').toLowerCase();
const isHexObjectId = (s) => typeof s === 'string' && /^[a-fA-F0-9]{24}$/.test(s);

// POST /api/requests
exports.createRequest = async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { capstoneId, groupName, tahunPengajuan } = body;

    if (!capstoneId || !groupName || !tahunPengajuan) {
      return res.status(400).json({
        error: 'Beberapa field wajib belum diisi',
        requiredFields: ['capstoneId', 'groupName', 'tahunPengajuan'],
        example: { capstoneId: '656f...', groupName: 'Nama Kelompok', tahunPengajuan: 2025 }
      });
    }
    if (!isHexObjectId(capstoneId)) {
      return res.status(400).json({ error: 'capstoneId tidak valid' });
    }

    const nama = String(groupName).trim();
    if (!nama) return res.status(400).json({ error: 'groupName tidak boleh kosong' });

    const cap = await Project.findById(capstoneId).lean();
    if (!cap) return res.status(404).json({ error: 'Capstone tidak ditemukan' });
    if (cap.capstoneStatus !== 'accepted') {
      return res.status(400).json({ error: 'Capstone tidak berstatus accepted' });
    }

    const dup = await Request.findOne({
      capstoneId,
      groupName: nama,
      tahunPengajuan: Number(tahunPengajuan)
    }).lean();
    if (dup) return res.status(409).json({ error: 'Request sudah ada' });

    const created = await Request.create({
      capstoneId,
      groupName: nama,
      tahunPengajuan: Number(tahunPengajuan),
      pemohonId: req.user?.id || 'u1'
    });

    return res.status(201).json(shape(created.toObject(), cap, false));
  } catch (err) {
    next(err);
  }
};

// GET /api/requests
exports.listRequests = async (req, res, next) => {
  try {
    const { status, capstoneId, decidedByRole, decidedByUser, decider, onlyOwned } = req.query;
    const embedCap = lower(req.query.expand || req.query.embed) === 'capstone';

    const q = {};
    if (status) q.status = status;
    if (capstoneId) {
      if (!isHexObjectId(capstoneId)) return res.status(400).json({ error: 'capstoneId tidak valid' });
      q.capstoneId = capstoneId;
    }
    if (decidedByRole) q.decidedByRole = decidedByRole;
    if (decidedByUser) q.decidedByUser = decidedByUser;

    if (lower(decider) === 'me') {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'User tidak terdeteksi. Kirim header x-user-id dan x-role' });
      }
      q.decidedByUser = req.user.id;
    }

    if (lower(onlyOwned) === 'true') {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'User tidak terdeteksi. Kirim header x-user-id dan x-role' });
      }
      const all = await Project.find().select('_id owner').lean();
      const ownedIds = all
        .filter(c => String(c.owner) === String(req.user.id))
        .map(c => c._id);
      if (!ownedIds.length && !q.capstoneId) {
        return res.json({ count: 0, data: [] });
      }
      if (!q.capstoneId) q.capstoneId = { $in: ownedIds };
    }

    const reqs = await Request.find(q).lean();
    const capIds = [...new Set(reqs.map(r => String(r.capstoneId)))];
    const caps = capIds.length
      ? await Project.find({ _id: { $in: capIds } }).select('_id title owner capstoneStatus tema').lean()
      : [];
    const capMap = new Map(caps.map(c => [String(c._id), c]));

    const data = reqs.map(r => shape(r, capMap.get(String(r.capstoneId)), embedCap));
    return res.json({ count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/requests/:id/decide
exports.decideRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isHexObjectId(id)) {
      return res.status(400).json({ error: 'id request tidak valid' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const decision = body.decision || req.query.decision;
    const override = lower(body.override ?? req.query.override ?? 'false') === 'true';
    const reason = body.reason || req.query.reason || null;
    const includeHistory = lower(req.query.history || 'false') === 'true';

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
    if (!['dosen', 'pemilik'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Hanya dosen atau pemilik yang boleh memutuskan' });
    }

    const r = await Request.findById(id);
    if (!r) return res.status(404).json({ error: 'Request tidak ditemukan' });

    const cap = await Project.findById(r.capstoneId).select('_id title owner capstoneStatus').lean();
    if (!cap) return res.status(404).json({ error: 'Capstone terkait tidak ditemukan' });

    if (req.user.role === 'pemilik' && String(cap.owner) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Anda bukan pemilik capstone ini, tidak boleh memutuskan' });
    }

    if (r.status !== 'pending' && !override) {
      return res.status(409).json({
        error: 'Request sudah diputuskan. Gunakan override=true untuk mengubah keputusan',
        currentStatus: r.status,
        example: { decision: 'accept', override: true, reason: 'Revisi setelah rapat' }
      });
    }

    const nextStatus = decision === 'accept' ? 'accepted' : 'rejected';
    const parsedReason = typeof reason === 'string' && reason.trim() ? reason.trim() : null;

    const hist = {
      from: r.status,
      to: nextStatus,
      byRole: req.user.role,
      byUser: req.user.id,
      reason: parsedReason,
      at: new Date()
    };

    r.status = nextStatus;
    r.reason = parsedReason;
    r.decidedByRole = req.user.role;
    r.decidedByUser = req.user.id;
    r.decidedAt = hist.at;
    r.history = Array.isArray(r.history) ? r.history : [];
    r.history.push(hist);
    await r.save();

    const shaped = shape(r.toObject(), cap, false);
    if (includeHistory) shaped.history = r.history || [];
    else delete shaped.history;

    return res.json(shaped);
  } catch (err) {
    next(err);
  }
};

// GET /api/requests/:id/history
exports.getRequestHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isHexObjectId(id)) {
      return res.status(400).json({ error: 'id request tidak valid' });
    }
    const r = await Request.findById(id).select('_id history').lean();
    if (!r) return res.status(404).json({ error: 'Request tidak ditemukan' });
    return res.json({ id: String(r._id), history: r.history || [] });
  } catch (err) {
    next(err);
  }
};

// GET /api/me/decisions?status=&embed=capstone
exports.listMyDecisions = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User tidak terdeteksi. Kirim header x-user-id dan x-role' });
    }
    const status = String(req.query.status || '').trim();
    const embedCap = String(req.query.embed || req.query.expand || '').toLowerCase() === 'capstone';

    const q = { decidedByUser: req.user.id };
    if (status) q.status = status;

    const reqs = await Request.find(q).lean();

    const capIds = [...new Set(reqs.map(r => String(r.capstoneId)))];
    const caps = capIds.length
      ? await Project.find({ _id: { $in: capIds } }).select('_id title owner capstoneStatus tema').lean()
      : [];
    const capMap = new Map(caps.map(c => [String(c._id), c]));

    const data = reqs.map(r => {
      const cap = capMap.get(String(r.capstoneId));
      const base = {
        id: String(r._id),
        capstoneId: String(r.capstoneId),
        groupName: r.groupName,
        tahunPengajuan: r.tahunPengajuan,
        pemohonId: r.pemohonId,
        status: r.status,
        reason: r.reason || null,
        decidedByRole: r.decidedByRole || null,
        decidedByUser: r.decidedByUser || null,
        decidedAt: r.decidedAt || null,
      };
      if (embedCap && cap) {
        base.capstone = {
          id: String(cap._id),
          judul: cap.title,
          kategori: cap.tema,
          pemilikId: String(cap.owner),
          status: cap.capstoneStatus
        };
      } else if (cap) {
        base.capstoneJudul = cap.title;
        base.capstonePemilikId = String(cap.owner);
      }
      return base;
    });

    return res.json({ count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/me/decisions/history?status=&embed=capstone
exports.listMyDecisionHistory = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User tidak terdeteksi. Kirim header x-user-id dan x-role' });
    }
    const status = String(req.query.status || '').trim();
    const embedCap = String(req.query.embed || req.query.expand || '').toLowerCase() === 'capstone';

    const q = {
      history: { $elemMatch: { byUser: req.user.id } }
    };
    if (status) q.status = status;

    const reqs = await Request.find(q).lean();

    const capIds = [...new Set(reqs.map(r => String(r.capstoneId)))];
    const caps = capIds.length
      ? await Project.find({ _id: { $in: capIds } }).select('_id title owner capstoneStatus tema').lean()
      : [];
    const capMap = new Map(caps.map(c => [String(c._id), c]));

    const data = reqs.map(r => {
      const cap = capMap.get(String(r.capstoneId));
      const myHistory = Array.isArray(r.history)
        ? r.history
            .filter(h => String(h.byUser) === String(req.user.id))
            .sort((a, b) => new Date(b.at) - new Date(a.at))
        : [];

      const base = {
        id: String(r._id),
        capstoneId: String(r.capstoneId),
        groupName: r.groupName,
        tahunPengajuan: r.tahunPengajuan,
        pemohonId: r.pemohonId,
        status: r.status,
        reason: r.reason || null,
        decidedByRole: r.decidedByRole || null,
        decidedByUser: r.decidedByUser || null,
        decidedAt: r.decidedAt || null,
        myLastDecision: myHistory[0] ? {
          from: myHistory[0].from,
          to: myHistory[0].to,
          at: myHistory[0].at,
          byRole: myHistory[0].byRole,
          reason: myHistory[0].reason || null
        } : null,
        myDecisionsCount: myHistory.length
      };

      if (embedCap && cap) {
        base.capstone = {
          id: String(cap._id),
          judul: cap.title,
          kategori: cap.tema,
          pemilikId: String(cap.owner),
          status: cap.capstoneStatus
        };
      } else if (cap) {
        base.capstoneJudul = cap.title;
        base.capstonePemilikId = String(cap.owner);
      }
      return base;
    });

    return res.json({ count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/me/owner/requests?embed=capstone
exports.listOwnedRequests = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "User tidak terdeteksi. Kirim header x-user-id dan x-role" });
    }
    if (req.user.role !== "pemilik") {
      return res.status(403).json({ error: "Hanya pemilik yang boleh mengakses" });
    }

    const owned = await Project.find({ owner: req.user.id }).select("_id title owner capstoneStatus tema").lean();
    if (!owned.length) return res.json({ count: 0, data: [] });

    const ownedIds = owned.map(c => c._id);
    const embed = String(req.query.embed || req.query.expand || "").toLowerCase() === "capstone";
    const reqs = await Request.find({ capstoneId: { $in: ownedIds } }).lean();

    const capMap = new Map(owned.map(c => [String(c._id), c]));

    const data = reqs.map(r => {
      const cap = capMap.get(String(r.capstoneId));
      const base = {
        id: String(r._id),
        capstoneId: String(r.capstoneId),
        groupName: r.groupName,
        tahunPengajuan: r.tahunPengajuan,
        pemohonId: r.pemohonId,
        status: r.status,
        reason: r.reason || null,
        decidedByRole: r.decidedByRole || null,
        decidedByUser: r.decidedByUser || null,
        decidedAt: r.decidedAt || null,
      };
      if (embed && cap) {
        base.capstone = {
          id: String(cap._id),
          judul: cap.title,
          kategori: cap.tema,
          pemilikId: String(cap.owner),
          status: cap.capstoneStatus,
        };
      } else if (cap) {
        base.capstoneJudul = cap.title;
        base.capstonePemilikId = String(cap.owner);
      }
      return base;
    });

    return res.json({ count: data.length, data });
  } catch (err) {
    next(err);
  }
};
