const mongoose = require('mongoose');

const Project = require('../models/Project');
const Request = require('../models/myRequestModel');
const Group = require('../models/groupModel');

const lower = (v) => String(v || '').toLowerCase();
const isHexObjectId = (s) => typeof s === 'string' && /^[a-fA-F0-9]{24}$/.test(s);

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id));
}

/*
  FITUR UTAMA CONTROLLER INI

  1. createRequest
     - Hanya ketua grup (owner) yang boleh mengajukan request.
     - Mencari grup aktif tempat user menjadi member.
     - Satu grup:
       * Tidak boleh punya request "accepted" ke proyek lain.
       * Maksimal 3 request "pending".
       * Tidak boleh request proyek yang sama pada tahun yang sama.
     - Menyimpan:
       * capstoneId
       * group (ObjectId Group)
       * groupName, tahunPengajuan, namaDosenPembimbing
       * pemohonId (user yang klik tombol, biasanya ketua grup)

  2. listRequests
     - Listing request umum (bisa filter status, capstoneId, onlyOwned, dsb).

  3. listMyRequests
     - Berbasis grup, bukan hanya pemohon.
     - Semua anggota grup bisa melihat semua request milik grupnya.
     - Mengembalikan juga:
       * groupId
       * groupOwnerId
       * canCancel: true hanya jika
         - status "pending"
         - pemohonId sama dengan user yang login (ketua)
       Jadi di frontend tombol Cancel bisa ditampilkan hanya ke ketua.

  4. decideRequest
     - Hanya pemilik project (owner Project) yang boleh memutuskan.
     - decision: "accept" atau "reject".
     - Simpan ke history.
     - Jika "accept":
       * capstoneStatus project = "accepted"
       * status project = "active"
       * Semua request lain dari grup yang sama dan masih pending
         di auto reject oleh sistem (status "rejected", byRole "system").
     - Jika "reject":
       * capstoneStatus project = "rejected"
       * status project = "inactive"

  5. getRequestHistory
     - Mengembalikan:
       * data status terakhir
       * history[] urutan penuh
       * data capstone (judul, tema, dll)
       * data group (nama, owner, anggota dengan nama)
     - Ini dipakai untuk halaman "Histori Pengajuan" dan detail.

  6. listMyDecisions dan listMyDecisionHistory
     - Untuk owner project melihat keputusan yang pernah ia buat.

  7. listOwnedRequests
     - Untuk Decision Inbox pemilik project.
     - Mengembalikan daftar request pending yang masuk ke project2 miliknya.
     - Sekarang ikut mengembalikan informasi grup:
       * group.id
       * group.name
       * group.ownerId
       * group.members (id dan name)

  8. cancelRequest
     - Hanya pemohon (ketua yang submit) yang boleh cancel.
     - Hanya bisa cancel jika status masih "pending".
     - Status berubah jadi "cancelled" dan dicatat di history
       dengan byRole "system", byUser = pemohon.
*/

// helper untuk bentuk response request
function shape(r, cap, embed) {
  const base = {
    id: String(r._id),
    capstoneId: String(r.capstoneId),
    groupId: r.group ? String(r.group) : null,
    groupName: r.groupName,
    tahunPengajuan: r.tahunPengajuan,
    namaDosenPembimbing: r.namaDosenPembimbing || null,
    pemohonId: r.pemohonId,
    status: r.status,
    reason: r.reason || null,
    decidedByRole: r.decidedByRole || null,
    decidedByUser: r.decidedByUser || null,
    decidedAt: r.decidedAt || null
  };

  if (embed && cap) {
    base.capstone = {
      id: String(cap._id),
      judul: cap.title,
      tema: cap.tema,
      status: cap.status,
      capstoneStatus: cap.capstoneStatus,
      ownerId: String(cap.owner),
      parentProject: cap.parentProject ? String(cap.parentProject) : null
    };
  } else if (cap) {
    base.capstonePemilikId = String(cap.owner);
    base.capstoneJudul = cap.title;
    base.capstoneStatus = cap.capstoneStatus;
  }

  return base;
}

// ===========================
// CREATE REQUEST
// ===========================
// POST /api/requests
exports.createRequest = async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { capstoneId, groupName, tahunPengajuan, namaDosenPembimbing } = body;

    if (!capstoneId || !groupName || !tahunPengajuan) {
      return res.status(400).json({
        error: 'Beberapa field wajib belum diisi',
        requiredFields: ['capstoneId', 'groupName', 'tahunPengajuan', 'namaDosenPembimbing'],
        example: {
          capstoneId: '656f...',
          groupName: 'Nama Kelompok',
          tahunPengajuan: 2025,
          namaDosenPembimbing: 'Dr. Budi'
        }
      });
    }

    // VALIDASI capstoneId benar-benar ObjectId
    if (!isValidObjectId(capstoneId)) {
      return res.status(400).json({ error: 'capstoneId tidak valid (bukan ObjectId)' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User tidak terdeteksi' });
    }

    const namaKelompok = String(groupName).trim();
    if (!namaKelompok) {
      return res.status(400).json({ error: 'groupName tidak boleh kosong' });
    }

    const tahun = Number(tahunPengajuan);
    if (!Number.isInteger(tahun) || tahun < 2000) {
      return res.status(400).json({ error: 'tahunPengajuan tidak valid' });
    }

    const namaDospem = String(namaDosenPembimbing || '').trim();
    if (!namaDospem) {
      return res.status(400).json({ error: 'namaDosenPembimbing tidak boleh kosong' });
    }

    // Pakai ObjectId yang sudah pasti valid
    const cap = await Project.findById(capstoneId).lean();
    if (!cap) {
      return res.status(404).json({ error: 'Project yang diminta tidak ditemukan' });
    }

    if (cap.capstoneStatus === 'accepted') {
      return res.status(400).json({
        error: 'Project ini sudah diterima untuk capstone lanjutan'
      });
    }
    if (cap.capstoneStatus === 'rejected') {
      return res.status(400).json({
        error: 'Project ini tidak menerima capstone lanjutan'
      });
    }

    // 1. cari grup yang berisi user ini (sebagai owner atau member)
    const userId = String(req.user._id || req.user.id);

    const myGroup = await Group.findOne({
      $or: [
        { owner: userId },
        { members: userId }
      ]
    }).lean();

    if (!myGroup) {
      return res.status(400).json({
        error: 'Anda belum tergabung dalam kelompok capstone'
      });
    }

    // 2. Hanya ketua (owner grup) yang boleh mengajukan request
    if (String(myGroup.owner) !== String(req.user.id)) {
      return res.status(403).json({
        error: 'Hanya ketua kelompok yang dapat mengajukan request'
      });
    }

    const groupId = myGroup._id;

    // 3. Cek apakah grup ini sudah punya request ACCEPTED
    const acceptedReq = await Request.findOne({
      group: groupId,
      status: 'accepted'
    }).lean();

    if (acceptedReq) {
      return res.status(400).json({
        error: 'Kelompok Anda sudah diterima di capstone lain. Tidak dapat mengajukan request baru.'
      });
    }

    // 4. Limit 3 pending per grup
    const pendingCount = await Request.countDocuments({
      group: groupId,
      status: 'pending'
    });

    if (pendingCount >= 3) {
      return res.status(400).json({
        error: 'Kelompok Anda sudah memiliki 3 request pending. Tidak dapat menambah request baru.'
      });
    }

    // 5. Cek duplikat request untuk project dan tahun yang sama oleh grup yang sama
    const dupe = await Request.findOne({
      capstoneId,
      group: groupId,
      tahunPengajuan: tahun,
      status: { $ne: 'cancelled' }
    }).lean();

    if (dupe) {
      return res.status(409).json({
        error: 'Request untuk project ini oleh kelompok Anda di tahun tersebut sudah ada.'
      });
    }

    const created = await Request.create({
      capstoneId,
      group: groupId,
      groupName: namaKelompok,
      tahunPengajuan: tahun,
      namaDosenPembimbing: namaDospem,
      pemohonId: String(req.user.id),
      status: 'pending'
    });

    return res.status(201).json(shape(created.toObject(), cap, false));
  } catch (err) {
    next(err);
  }
};

// ===========================
// LIST REQUEST UMUM
// ===========================
// GET /api/requests
exports.listRequests = async (req, res, next) => {
  try {
    const {
      status,
      capstoneId,
      decidedByRole,
      decidedByUser,
      decider,
      onlyOwned
    } = req.query;

    const embedCap = lower(req.query.embed || req.query.expand) === 'capstone';

    const q = {};
    if (status) q.status = status;
    if (capstoneId) {
      if (!isHexObjectId(capstoneId)) {
        return res.status(400).json({ error: 'capstoneId tidak valid' });
      }
      q.capstoneId = capstoneId;
    }
    if (decidedByRole) q.decidedByRole = decidedByRole;
    if (decidedByUser) q.decidedByUser = decidedByUser;

    if (lower(decider) === 'me') {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'User tidak terdeteksi' });
      }
      q.decidedByUser = req.user.id;
    }

    // onlyOwned = hanya request yang masuk ke project yang dimiliki user
    let capMap = null;
    if (lower(onlyOwned) === 'true') {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'User tidak terdeteksi' });
      }
      const owned = await Project.find({ owner: req.user.id })
        .select('_id title owner tema status capstoneStatus parentProject')
        .lean();
      if (!owned.length) {
        return res.json({ count: 0, data: [] });
      }
      const ownedIds = owned.map((c) => c._id);
      q.capstoneId = { $in: ownedIds };
      capMap = new Map(owned.map((c) => [String(c._id), c]));
    }

    const reqs = await Request.find(q).lean();

    if (!capMap) {
      const capIds = [...new Set(reqs.map((r) => String(r.capstoneId)))];
      const caps = capIds.length
        ? await Project.find({ _id: { $in: capIds } })
            .select('_id title owner tema status capstoneStatus parentProject')
            .lean()
        : [];
      capMap = new Map(caps.map((c) => [String(c._id), c]));
    }

    const data = reqs.map((r) => shape(r, capMap.get(String(r.capstoneId)), embedCap));
    return res.json({ count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// ===========================
// LIST MY REQUEST (tab My Request)
// Semua anggota grup bisa melihat request grupnya
// ===========================
// GET /api/requests/my
exports.listMyRequests = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User tidak terdeteksi' });
    }

    const embedCap = lower(req.query.embed || req.query.expand) === 'capstone';

    // Cari semua grup aktif yang berisi user ini
    const groups = await Group.find({
    $or: [
    { owner: req.user.id },
    { members: req.user.id }
    ]
  })
    .select('_id name owner members')
    .lean();

    const groupIds = groups.map((g) => g._id);
    const groupMap = new Map(groups.map((g) => [String(g._id), g]));

    // Ambil semua request milik grup2 tersebut
    const reqs = await Request.find({ group: { $in: groupIds } }).lean();

    const capIds = [...new Set(reqs.map((r) => String(r.capstoneId)))];
    const caps = capIds.length
      ? await Project.find({ _id: { $in: capIds } })
          .select('_id title owner tema status capstoneStatus parentProject')
          .lean()
      : [];
    const capMap = new Map(caps.map((c) => [String(c._id), c]));

    const data = reqs.map((r) => {
      const base = shape(r, capMap.get(String(r.capstoneId)), embedCap);
      const g = groupMap.get(String(r.group));

      return {
        ...base,
        groupOwnerId: g ? String(g.owner) : null,
        // hanya ketua (pemohon) yang boleh cancel
        canCancel:
          r.status === 'pending' &&
          String(r.pemohonId) === String(req.user.id)
      };
    });

    return res.json({ count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// ===========================
// DECIDE REQUEST
// ===========================
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

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User tidak terdeteksi' });
    }

    if (req.user.role !== 'mahasiswa') {
      return res.status(403).json({
        error: 'Hanya mahasiswa pemilik project yang boleh memutuskan request'
      });
    }

    const r = await Request.findById(id);
    if (!r) {
      return res.status(404).json({ error: 'Request tidak ditemukan' });
    }

    const cap = await Project.findById(r.capstoneId);
    if (!cap) {
      return res.status(404).json({ error: 'Project terkait request tidak ditemukan' });
    }

    // cek apakah user ini owner project yang dimaksud
    if (String(cap.owner) !== String(req.user.id)) {
      return res.status(403).json({
        error: 'Anda bukan pemilik project ini. Tidak boleh memutuskan request.'
      });
    }

    if (r.status !== 'pending' && !override) {
      return res.status(409).json({
        error: 'Request sudah diputuskan. Gunakan override=true untuk mengubah keputusan',
        currentStatus: r.status,
        example: {
          decision: 'accept',
          override: true,
          reason: 'Revisi setelah diskusi'
        }
      });
    }

    const nextStatus = decision === 'accept' ? 'accepted' : 'rejected';
    const parsedReason =
      typeof reason === 'string' && reason.trim() ? reason.trim() : null;

    const now = new Date();
    const decideRole = 'pemilik';

    // history untuk permintaan utama
    const hist = {
      from: r.status,
      to: nextStatus,
      byRole: decideRole,
      byUser: String(req.user.id),
      reason: parsedReason,
      at: now
    };

    r.status = nextStatus;
    r.reason = parsedReason;
    r.decidedByRole = decideRole;
    r.decidedByUser = String(req.user.id);
    r.decidedAt = now;
    r.history = Array.isArray(r.history) ? r.history : [];
    r.history.push(hist);

    // update project sesuai alur
    if (decision === 'accept') {
      // Project mahasiswa baru berubah:
      // capstoneStatus = 'accepted', status = 'active'
      cap.capstoneStatus = 'accepted';
      cap.status = 'active';
      await cap.save();

      // AUTO REJECT BY SYSTEM
      // Semua request lain milik grup yang sama dan masih pending akan di-reject
      const otherPending = await Request.find({
        _id: { $ne: r._id },
        group: r.group,
        status: 'pending'
      });

      const systemReason =
        'Rejected by System (Kelompok Anda sudah diterima di capstone lain)';

      for (const other of otherPending) {
        const h = {
          from: other.status,
          to: 'rejected',
          byRole: 'system',
          byUser: null,
          reason: systemReason,
          at: now
        };

        other.status = 'rejected';
        other.reason = systemReason;
        other.decidedByRole = 'system';
        other.decidedByUser = null;
        other.decidedAt = now;
        other.history = Array.isArray(other.history) ? other.history : [];
        other.history.push(h);

        await other.save();
      }
    } else if (decision === 'reject') {
      // Project mahasiswa baru berubah:
      // capstoneStatus = 'rejected', status = 'inactive'
      cap.capstoneStatus = 'rejected';
      cap.status = 'inactive';
      await cap.save();
    }

    await r.save();

    let capEmbed = null;
    if (includeHistory || lower(req.query.embed) === 'capstone') {
      capEmbed = await Project.findById(r.capstoneId)
        .select('_id title owner tema status capstoneStatus parentProject')
        .lean();
    }

    const data = shape(r.toObject(), capEmbed, !!capEmbed);
    if (includeHistory) {
      data.history = r.history;
    }

    return res.json(data);
  } catch (err) {
    next(err);
  }
};

// ===========================
// GET HISTORY REQUEST
// Sekarang ikut mengembalikan info capstone dan info group + anggota
// ===========================
// GET /api/requests/:id/history
exports.getRequestHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isHexObjectId(id)) {
      return res.status(400).json({ error: 'id request tidak valid' });
    }

    const r = await Request.findById(id)
      .populate({
        path: 'capstoneId',
        select: 'title tema status capstoneStatus owner parentProject'
      })
      .populate({
        path: 'group',
        select: 'name owner members',
        populate: {
          path: 'members',
          select: 'name'
        }
      })
      .lean();

    if (!r) {
      return res.status(404).json({ error: 'Request tidak ditemukan' });
    }

    // siapkan info capstone
    const cap = r.capstoneId;
    const capstone = cap
      ? {
          id: String(cap._id),
          judul: cap.title,
          tema: cap.tema,
          status: cap.status,
          capstoneStatus: cap.capstoneStatus,
          ownerId: String(cap.owner),
          parentProject: cap.parentProject ? String(cap.parentProject) : null
        }
      : null;

    // siapkan info group + anggota
    const g = r.group;
    const group = g
      ? {
          id: String(g._id),
          name: g.name,
          ownerId: g.owner ? String(g.owner._id || g.owner) : null,
          members: Array.isArray(g.members)
            ? g.members.map((m) => ({
                id: String(m._id || m),
                name: m.name || null
              }))
            : []
        }
      : null;

    return res.json({
      id: String(r._id),
      capstoneId: String(r.capstoneId?._id || r.capstoneId),
      groupId: r.group ? String(r.group._id || r.group) : null,
      status: r.status,
      decidedByRole: r.decidedByRole || null,
      decidedByUser: r.decidedByUser || null,
      decidedAt: r.decidedAt || null,
      history: Array.isArray(r.history) ? r.history : [],
      capstone,
      group
    });
  } catch (err) {
    next(err);
  }
};

// ===========================
// LIST MY DECISIONS
// ===========================
// GET /api/me/decisions
exports.listMyDecisions = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User tidak terdeteksi' });
    }

    const status = String(req.query.status || '').trim();
    const embedCap = lower(req.query.embed || req.query.expand) === 'capstone';

    const q = { decidedByUser: String(req.user.id) };
    if (status) q.status = status;

    const reqs = await Request.find(q).lean();

    const capIds = [...new Set(reqs.map((r) => String(r.capstoneId)))];
    const caps = capIds.length
      ? await Project.find({ _id: { $in: capIds } })
          .select('_id title owner tema status capstoneStatus parentProject')
          .lean()
      : [];
    const capMap = new Map(caps.map((c) => [String(c._id), c]));

    const data = reqs.map((r) => {
      const cap = capMap.get(String(r.capstoneId));
      const history = Array.isArray(r.history) ? r.history : [];
      const myHistory = history
        .filter((h) => String(h.byUser) === String(req.user.id))
        .sort((a, b) => new Date(b.at) - new Date(a.at));

      const base = {
        id: String(r._id),
        capstoneId: String(r.capstoneId),
        groupId: r.group ? String(r.group) : null,
        groupName: r.groupName,
        tahunPengajuan: r.tahunPengajuan,
        pemohonId: r.pemohonId,
        status: r.status,
        reason: r.reason || null,
        decidedByRole: r.decidedByRole || null,
        decidedByUser: r.decidedByUser || null,
        decidedAt: r.decidedAt || null,
        myLastDecision: myHistory[0]
          ? {
              from: myHistory[0].from,
              to: myHistory[0].to,
              at: myHistory[0].at,
              byRole: myHistory[0].byRole,
              reason: myHistory[0].reason || null
            }
          : null,
        myDecisionsCount: myHistory.length
      };

      if (embedCap && cap) {
        base.capstone = {
          id: String(cap._id),
          judul: cap.title,
          tema: cap.tema,
          status: cap.status,
          capstoneStatus: cap.capstoneStatus,
          ownerId: String(cap.owner),
          parentProject: cap.parentProject ? String(cap.parentProject) : null
        };
      }

      return base;
    });

    return res.json({ count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// ===========================
// LIST MY DECISIONS HISTORY
// ===========================
// GET /api/me/decisions/history
exports.listMyDecisionHistory = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User tidak terdeteksi' });
    }

    const status = String(req.query.status || '').trim();
    const embedCap = lower(req.query.embed || req.query.expand) === 'capstone';

    const q = { history: { $elemMatch: { byUser: String(req.user.id) } } };
    if (status) q.status = status;

    const reqs = await Request.find(q).lean();

    const capIds = [...new Set(reqs.map((r) => String(r.capstoneId)))];
    const caps = capIds.length
      ? await Project.find({ _id: { $in: capIds } })
          .select('_id title owner tema status capstoneStatus parentProject')
          .lean()
      : [];
    const capMap = new Map(caps.map((c) => [String(c._id), c]));

    const data = reqs.map((r) => {
      const cap = capMap.get(String(r.capstoneId));
      const myHistory = Array.isArray(r.history)
        ? r.history
            .filter((h) => String(h.byUser) === String(req.user.id))
            .sort((a, b) => new Date(b.at) - new Date(a.at))
        : [];

      const base = {
        id: String(r._id),
        capstoneId: String(r.capstoneId),
        groupId: r.group ? String(r.group) : null,
        groupName: r.groupName,
        tahunPengajuan: r.tahunPengajuan,
        pemohonId: r.pemohonId,
        status: r.status,
        reason: r.reason || null,
        decidedByRole: r.decidedByRole || null,
        decidedByUser: r.decidedByUser || null,
        decidedAt: r.decidedAt || null,
        myLastDecision: myHistory[0]
          ? {
              from: myHistory[0].from,
              to: myHistory[0].to,
              at: myHistory[0].at,
              byRole: myHistory[0].byRole,
              reason: myHistory[0].reason || null
            }
          : null,
        myDecisionsCount: myHistory.length
      };

      if (embedCap && cap) {
        base.capstone = {
          id: String(cap._id),
          judul: cap.title,
          tema: cap.tema,
          status: cap.status,
          capstoneStatus: cap.capstoneStatus,
          ownerId: String(cap.owner),
          parentProject: cap.parentProject ? String(cap.parentProject) : null
        };
      }

      return base;
    });

    return res.json({ count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// ===========================
// LIST OWNED REQUESTS (Decision Inbox pemilik)
// ===========================
// GET /api/me/owner/requests
exports.listOwnedRequests = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User tidak terdeteksi' });
    }

    if (req.user.role !== 'mahasiswa') {
      return res.status(403).json({
        error: 'Hanya mahasiswa pemilik project yang boleh mengakses decision inbox'
      });
    }

    const owned = await Project.find({ owner: req.user.id })
      .select('_id title owner tema status capstoneStatus parentProject')
      .lean();

    if (!owned.length) {
      return res.json({ count: 0, data: [] });
    }

    const ownedIds = owned.map((c) => c._id);
    const embed = lower(req.query.embed || req.query.expand) === 'capstone';

    const reqs = await Request.find({
      capstoneId: { $in: ownedIds },
      status: 'pending'
    }).lean();

    const capMap = new Map(owned.map((c) => [String(c._id), c]));

    // ambil info grup untuk semua request di inbox
    const groupIds = [...new Set(reqs.map((r) => String(r.group)))].filter(Boolean);
    const groups = groupIds.length
      ? await Group.find({ _id: { $in: groupIds } })
          .select('name owner members')
          .populate({ path: 'members', select: 'name' })
          .lean()
      : [];
    const groupMap = new Map(groups.map((g) => [String(g._id), g]));

    const data = reqs.map((r) => {
      const cap = capMap.get(String(r.capstoneId));
      const g = groupMap.get(String(r.group));
      const base = {
        id: String(r._id),
        capstoneId: String(r.capstoneId),
        groupId: r.group ? String(r.group) : null,
        groupName: r.groupName,
        tahunPengajuan: r.tahunPengajuan,
        pemohonId: r.pemohonId,
        status: r.status,
        reason: r.reason || null,
        decidedByRole: r.decidedByRole || null,
        decidedByUser: r.decidedByUser || null,
        decidedAt: r.decidedAt || null
      };

      if (embed && cap) {
        base.capstone = {
          id: String(cap._id),
          judul: cap.title,
          tema: cap.tema,
          status: cap.status,
          capstoneStatus: cap.capstoneStatus,
          ownerId: String(cap.owner),
          parentProject: cap.parentProject ? String(cap.parentProject) : null
        };
      }

      if (g) {
        base.group = {
          id: String(g._id),
          name: g.name,
          ownerId: g.owner ? String(g.owner._id || g.owner) : null,
          members: Array.isArray(g.members)
            ? g.members.map((m) => ({
                id: String(m._id || m),
                name: m.name || null
              }))
            : []
        };
      }

      return base;
    });

    return res.json({ count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// ===========================
// CANCEL REQUEST
// Hanya pemohon (ketua) yang boleh cancel
// ===========================
// DELETE /api/requests/:id/cancel
exports.cancelRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isHexObjectId(id)) {
      return res.status(400).json({ error: 'id request tidak valid' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User tidak terdeteksi' });
    }

    const r = await Request.findById(id);
    if (!r) {
      return res.status(404).json({ error: 'Request tidak ditemukan' });
    }

    // hanya pemohon (ketua yang submit) yang boleh cancel
    if (String(r.pemohonId) !== String(req.user.id)) {
      return res.status(403).json({
        error: 'Anda bukan pemilik request ini. Tidak dapat membatalkan.'
      });
    }

    if (r.status !== 'pending') {
      return res.status(400).json({
        error: 'Hanya request dengan status pending yang dapat dibatalkan'
      });
    }

    const now = new Date();

    const hist = {
      from: r.status,
      to: 'cancelled',
      byRole: 'system',
      byUser: String(req.user.id),
      reason: 'Cancelled by User',
      at: now
    };

    r.status = 'cancelled';
    r.reason = 'Cancelled by User';
    r.decidedByRole = 'system';
    r.decidedByUser = String(req.user.id);
    r.decidedAt = now;
    r.history = Array.isArray(r.history) ? r.history : [];
    r.history.push(hist);

    await r.save();

    return res.json({
      success: true,
      message: 'Request berhasil dibatalkan',
      data: {
        id: String(r._id),
        status: r.status,
        reason: r.reason
      }
    });
  } catch (err) {
    next(err);
  }
};
