const Store = require('../models/store');

// GET /api/browse/capstones?status=...&kategori=...
// Default hanya "Bisa dilanjutkan". status=all untuk semua.
exports.listCapstones = (req, res) => {
  const { status, kategori } = req.query;
  let data = Store.capstones;

  if (status) {
    if (String(status).toLowerCase() !== 'all') {
      data = data.filter(c => c.status.toLowerCase() === String(status).toLowerCase());
    }
  } else {
    data = data.filter(c => c.status === Store.CAPSTONE_STATUS.BISA_DILANJUTKAN);
  }

  if (kategori) {
    data = data.filter(c => c.kategori.toLowerCase() === String(kategori).toLowerCase());
  }

  res.json({ count: data.length, data });
};

// GET /api/browse/capstones/:id
exports.getCapstoneById = (req, res) => {
  const cap = Store.capstones.find(c => c.id === req.params.id);
  if (!cap) return res.status(404).json({ error: 'Capstone tidak ditemukan' });
  res.json(cap);
};

// GET /api/browse/categories
exports.listCategories = (req, res) => {
  if (String(req.query.withCounts).toLowerCase() !== 'true') {
    return res.json({ count: Store.CATEGORIES.length, data: Store.CATEGORIES });
  }
  const counts = Store.CATEGORIES.map(cat => {
    const rows = Store.capstones.filter(c => c.kategori === cat);
    return {
      category: cat,
      total: rows.length,
      bisaDilanjutkan: rows.filter(r => r.status === Store.CAPSTONE_STATUS.BISA_DILANJUTKAN).length
    };
  });
  res.json({ count: counts.length, data: counts });
};

// GET /api/browse/categories/:category/capstones
// Query: status=all, page, limit
exports.listCapstonesByCategory = (req, res) => {
  const raw = decodeURIComponent(req.params.category || '');
  const matched = Store.CATEGORIES.find(e => e.toLowerCase() === raw.toLowerCase());
  if (!matched) {
    return res.status(400).json({ error: 'Kategori tidak valid', allowed: Store.CATEGORIES });
  }

  const status = req.query.status;
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.max(parseInt(req.query.limit || '10', 10), 1);
  const skip = (page - 1) * limit;

  let data = Store.capstones.filter(c => c.kategori === matched);
  if (!status || String(status).toLowerCase() !== 'all') {
    data = data.filter(c => c.status === Store.CAPSTONE_STATUS.BISA_DILANJUTKAN);
  }

  const sliced = data.slice(skip, skip + limit);
  res.json({
    meta: { page, limit, total: data.length, totalPages: Math.ceil(data.length / limit) },
    count: sliced.length,
    data: sliced
  });
};
