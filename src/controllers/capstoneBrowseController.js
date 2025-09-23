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
