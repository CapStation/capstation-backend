const Store = require('../models/store');

exports.listCapstones = (req, res) => {
  const { status, kategori } = req.query;
  let data = Store.capstones;

  if (status) {
    // jika status=all maka tidak difilter
    if (String(status).toLowerCase() !== 'all') {
      data = data.filter(
        c => c.status.toLowerCase() === String(status).toLowerCase()
      );
    }
  } else {
    // default hanya yang "Bisa dilanjutkan"
    data = data.filter(
      c => c.status === Store.CAPSTONE_STATUS.BISA_DILANJUTKAN
    );
  }

  if (kategori) {
    data = data.filter(
      c => c.kategori.toLowerCase() === String(kategori).toLowerCase()
    );
  }

  res.json({ count: data.length, data });
};

exports.getCapstoneById = (req, res) => {
  const { id } = req.params;
  const cap = Store.capstones.find(c => c.id === id);
  if (!cap) return res.status(404).json({ error: 'Capstone tidak ditemukan' });
  res.json(cap);
};