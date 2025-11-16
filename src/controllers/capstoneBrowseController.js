const Project = require('../models/Project'); // Use unified Project model

function normalizeStatus(s) {
  if (s === 'pending') return 'Dalam proses';
  if (s === 'rejected') return 'Selesai';
  if (s === 'accepted') return 'Bisa dilanjutkan';
  return s;
}

function pickKategori(req) {
  return req.query.category || req.query.kategori || null;
}

// GET /api/browse/capstones?status=...&category=... | &kategori=...
exports.listCapstones = async (req, res, next) => {
  try {
    const { status } = req.query;
    const kategori = pickKategori(req);

    const q = {};
    if (status) {
      if (String(status).toLowerCase() !== 'all') q.capstoneStatus = status;
    } else {
      q.capstoneStatus = 'accepted';
    }
    if (kategori) q.tema = kategori; 

    const docs = await Project.find(q).lean();
    const data = docs.map(d => ({
      id: String(d._id),
      judul: d.title,
      kategori: d.tema, 
      tahun: d.academicYear, 
      pemilikId: String(d.owner),
      status: normalizeStatus(d.capstoneStatus)
    }));
    res.json({ count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/browse/capstones/:id
exports.getCapstoneById = async (req, res, next) => {
  try {
    const cap = await Project.findById(req.params.id).lean();
    if (!cap) return res.status(404).json({ error: 'Capstone tidak ditemukan' });
    res.json({
      id: String(cap._id),
      judul: cap.title,
      kategori: cap.tema,
      tahun: cap.academicYear,
      pemilikId: String(cap.owner),
      status: normalizeStatus(cap.capstoneStatus)
    });
  } catch (err) {
    next(err); 
  }
};

// GET /api/browse/categories[?withCounts=true]
exports.listCategories = async (req, res, next) => {
  try {
    const { getValidThemes } = require('../configs/themes');
    const enums = getValidThemes(); 
    if (String(req.query.withCounts).toLowerCase() !== 'true') {
      return res.json({ count: enums.length, data: enums });
    }

    const rows = await Project.aggregate([
      { $group: { _id: { tema: '$tema', capstoneStatus: '$capstoneStatus' }, count: { $sum: 1 } } }
    ]);

    const map = {};
    for (const cat of enums) map[cat] = { category: cat, total: 0, bisaDilanjutkan: 0 };

    for (const r of rows) {
      const cat = r._id.tema;
      const st  = r._id.capstoneStatus;
      if (!map[cat]) map[cat] = { category: cat, total: 0, bisaDilanjutkan: 0 };
      map[cat].total += r.count;
      if (st === 'accepted') map[cat].bisaDilanjutkan += r.count;
    }

    const data = enums.map(cat => map[cat]);
    res.json({ count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/browse/categories/:category/capstones?status=all&page=1&limit=10
exports.listCapstonesByCategory = async (req, res, next) => {
  try {
    const { getValidThemes } = require('../configs/themes');
    const enums = getValidThemes();
    const raw = decodeURIComponent(req.params.category || '');
    const matched = enums.find(e => e.toLowerCase() === raw.toLowerCase());
    if (!matched) {
      return res.status(400).json({ error: 'Kategori tidak valid', allowed: enums });
    }

    const status = req.query.status;
    const page  = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.max(parseInt(req.query.limit || '10', 10), 1);
    const skip  = (page - 1) * limit;

    const q = { tema: matched };
    if (!status || String(status).toLowerCase() !== 'all') q.capstoneStatus = 'accepted';

    const [rows, total] = await Promise.all([
      Project.find(q).skip(skip).limit(limit).lean(),
      Project.countDocuments(q)
    ]);

    const data = rows.map(d => ({
      id: String(d._id),
      judul: d.title,
      kategori: d.tema,
      tahun: d.academicYear,
      pemilikId: String(d.owner),
      status: normalizeStatus(d.capstoneStatus)
    }));

    res.json({
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      count: data.length,
      data
    });
  } catch (err) {
    next(err);
  }
};
