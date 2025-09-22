const Capstone = require('../models/capstoneModel');

// Detail capstone
exports.getCapstoneById = async (req, res, next) => {
  try {
    const capstone = await Capstone.findById(req.params.id)
      .populate('owner', 'name email role')
      .populate('members', 'name email role');

    if (!capstone) return res.status(404).json({ message: 'Capstone not found' });
    res.json(capstone);
  } catch (err) {
    next(err);
  }
};

// Update status proyek - hanya owner yang bisa mengubah status
exports.updateCapstoneStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validasi status yang diizinkan
    const allowedStatuses = ['Menunggu', 'Bisa dilanjutkan', 'Ditutup'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Status tidak valid. Status harus salah satu dari: Menunggu, Bisa dilanjutkan, Ditutup' 
      });
    }

    // Cari capstone
    const capstone = await Capstone.findById(id);
    if (!capstone) {
      return res.status(404).json({ message: 'Capstone tidak ditemukan' });
    }

    // Cek apakah user adalah owner dari proyek
    if (capstone.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Akses ditolak. Hanya pemilik proyek yang dapat mengubah status.' 
      });
    }

    // Update status
    capstone.status = status;
    await capstone.save();

    // Return updated capstone with populated fields
    const updatedCapstone = await Capstone.findById(id)
      .populate('owner', 'name email role')
      .populate('members', 'name email role');

    res.json({
      message: `Status proyek berhasil diubah menjadi "${status}"`,
      capstone: updatedCapstone
    });

  } catch (err) {
    next(err);
  }
};
