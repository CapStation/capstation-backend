const Capstone = require('../models/myCapstoneModel');

function normalizeStatus(s) {
  if (s === 'Menunggu') return 'Dalam proses';
  if (s === 'Ditutup') return 'Selesai';
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
      if (String(status).toLowerCase() !== 'all') q.status = status;
    } else {
      q.status = 'Bisa dilanjutkan';
    }
    if (kategori) q.category = kategori;

    const docs = await Capstone.find(q).lean();
    const data = docs.map(d => ({
      id: String(d._id),
      judul: d.title,
      kategori: d.category,
      tahun: d.year,
      pemilikId: String(d.owner),
      status: normalizeStatus(d.status)
    }));
    res.json({ count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/browse/capstones/:id
exports.getCapstoneById = async (req, res, next) => {
  try {
    const cap = await Capstone.findById(req.params.id).lean();
    if (!cap) return res.status(404).json({ error: 'Capstone tidak ditemukan' });
    res.json({
      id: String(cap._id),
      judul: cap.title,
      kategori: cap.category,
      tahun: cap.year,
      pemilikId: String(cap.owner),
      status: normalizeStatus(cap.status)
    });
  } catch (err) {
    next(err); 
  }
};

// GET /api/browse/categories[?withCounts=true]
exports.listCategories = async (req, res, next) => {
  try {
    const enums = Capstone.schema.path('category').enumValues || [];
    if (String(req.query.withCounts).toLowerCase() !== 'true') {
      return res.json({ count: enums.length, data: enums });
    }

    const rows = await Capstone.aggregate([
      { $group: { _id: { category: '$category', status: '$status' }, count: { $sum: 1 } } }
    ]);

    const map = {};
    for (const cat of enums) map[cat] = { category: cat, total: 0, bisaDilanjutkan: 0 };

    for (const r of rows) {
      const cat = r._id.category;
      const st  = r._id.status;
      if (!map[cat]) map[cat] = { category: cat, total: 0, bisaDilanjutkan: 0 };
      map[cat].total += r.count;
      if (st === 'Bisa dilanjutkan') map[cat].bisaDilanjutkan += r.count;
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
    const enums = Capstone.schema.path('category').enumValues || [];
    const raw = decodeURIComponent(req.params.category || '');
    const matched = enums.find(e => e.toLowerCase() === raw.toLowerCase());
    if (!matched) {
      return res.status(400).json({ error: 'Kategori tidak valid', allowed: enums });
    }

    const status = req.query.status;
    const page  = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.max(parseInt(req.query.limit || '10', 10), 1);
    const skip  = (page - 1) * limit;

    const q = { category: matched };
    if (!status || String(status).toLowerCase() !== 'all') q.status = 'Bisa dilanjutkan';

    const [rows, total] = await Promise.all([
      Capstone.find(q).skip(skip).limit(limit).lean(),
      Capstone.countDocuments(q)
    ]);

    const data = rows.map(d => ({
      id: String(d._id),
      judul: d.title,
      kategori: d.category,
      tahun: d.year,
      pemilikId: String(d.owner),
      status: normalizeStatus(d.status)
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
