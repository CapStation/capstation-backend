const Project = require('../models/Project');

// Label untuk status project (status kerja)
function projectStatusLabel(status) {
  switch (status) {
    case 'inactive':
      return 'Tidak aktif';
    case 'active':
      return 'Sedang dikerjakan';
    case 'selesai':
      return 'Selesai';
    case 'dapat_dilanjutkan':
      return 'Bisa dilanjutkan';
    default:
      return status || '';
  }
}

// Label untuk capstoneStatus (status request kelanjutan)
function capstoneStatusLabel(st) {
  switch (st) {
    case 'new':
      return 'Project baru';
    case 'pending':
      return 'Menunggu persetujuan';
    case 'accepted':
      return 'Request diterima';
    case 'rejected':
      return 'Request ditolak';
    default:
      return st || '';
  }
}

function pickKategori(req) {
  return req.query.category || req.query.kategori || null;
}

/**
 * GET /api/browse/capstones?status=...&category=...
 *
 * Catatan:
 * - Query `status` sekarang mengacu ke Project.status
 *   ['inactive','active','selesai','dapat_dilanjutkan']
 * - Default jika tidak ada query `status`
 *   → hanya tampilkan project yang `status = 'dapat_dilanjutkan'`
 *   supaya cocok dengan kebutuhan Submit Request.
 */
exports.listCapstones = async (req, res, next) => {
  try {
    const rawStatus = req.query.status;
    const kategori = pickKategori(req);

    const q = {};

    if (rawStatus && String(rawStatus).toLowerCase() !== 'all') {
      // gunakan status sesuai enum di model Project
      q.status = rawStatus;
    } else if (!rawStatus) {
      // default: hanya project yang boleh direquest
      q.status = 'dapat_dilanjutkan';
    }

    if (kategori) {
      q.tema = kategori;
    }

    const docs = await Project.find(q).lean();

    const data = docs.map((d) => ({
      id: String(d._id),
      judul: d.title,
      kategori: d.tema,
      tahun: d.academicYear,
      pemilikId: String(d.owner),

      // kirim raw status dan label human readable
      status: d.status,
      statusLabel: projectStatusLabel(d.status),

      capstoneStatus: d.capstoneStatus,
      capstoneStatusLabel: capstoneStatusLabel(d.capstoneStatus)
    }));

    res.json({ count: data.length, data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/browse/capstones/:id
 */
exports.getCapstoneById = async (req, res, next) => {
  try {
    const cap = await Project.findById(req.params.id).lean();
    if (!cap) {
      return res.status(404).json({ error: 'Capstone tidak ditemukan' });
    }

    res.json({
      id: String(cap._id),
      judul: cap.title,
      kategori: cap.tema,
      tahun: cap.academicYear,
      pemilikId: String(cap.owner),

      status: cap.status,
      statusLabel: projectStatusLabel(cap.status),

      capstoneStatus: cap.capstoneStatus,
      capstoneStatusLabel: capstoneStatusLabel(cap.capstoneStatus)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/browse/categories[?withCounts=true]
 *
 * Jika withCounts=true:
 * - total  = jumlah semua project di kategori itu
 * - bisaDilanjutkan = jumlah project dengan status 'dapat_dilanjutkan'
 */
exports.listCategories = async (req, res, next) => {
  try {
    const { getValidThemes } = require('../configs/themes');
    const enums = getValidThemes();

    const withCounts =
      String(req.query.withCounts || '').toLowerCase() === 'true';

    if (!withCounts) {
      return res.json({ count: enums.length, data: enums });
    }

    const rows = await Project.aggregate([
      {
        $group: {
          _id: { tema: '$tema', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    const map = {};
    for (const cat of enums) {
      map[cat] = { category: cat, total: 0, bisaDilanjutkan: 0 };
    }

    for (const r of rows) {
      const cat = r._id.tema;
      const st = r._id.status;
      if (!map[cat]) {
        map[cat] = { category: cat, total: 0, bisaDilanjutkan: 0 };
      }
      map[cat].total += r.count;
      if (st === 'dapat_dilanjutkan') {
        map[cat].bisaDilanjutkan += r.count;
      }
    }

    const data = enums.map((cat) => map[cat]);
    res.json({ count: data.length, data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/browse/categories/:category/capstones
 *    ?status=all&page=1&limit=10
 *
 * - Param `status` mengacu ke Project.status
 * - Default di dalam kategori
 *   → hanya tampilkan yang status = 'dapat_dilanjutkan'
 *   kecuali status=all.
 */
exports.listCapstonesByCategory = async (req, res, next) => {
  try {
    const { getValidThemes } = require('../configs/themes');
    const enums = getValidThemes();

    const raw = decodeURIComponent(req.params.category || '');
    const matched = enums.find((e) => e.toLowerCase() === raw.toLowerCase());
    if (!matched) {
      return res.status(400).json({ error: 'Kategori tidak valid', allowed: enums });
    }

    const status = req.query.status;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.max(parseInt(req.query.limit || '10', 10), 1);
    const skip = (page - 1) * limit;

    const q = { tema: matched };

    if (!status || String(status).toLowerCase() !== 'all') {
      q.status = status || 'dapat_dilanjutkan';
    }

    const [rows, total] = await Promise.all([
      Project.find(q).skip(skip).limit(limit).lean(),
      Project.countDocuments(q)
    ]);

    const data = rows.map((d) => ({
      id: String(d._id),
      judul: d.title,
      kategori: d.tema,
      tahun: d.academicYear,
      pemilikId: String(d.owner),

      status: d.status,
      statusLabel: projectStatusLabel(d.status),

      capstoneStatus: d.capstoneStatus,
      capstoneStatusLabel: capstoneStatusLabel(d.capstoneStatus)
    }));

    res.json({
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      count: data.length,
      data
    });
  } catch (err) {
    next(err);
  }
};
