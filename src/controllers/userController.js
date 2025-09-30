const User = require('../models/userModel');
const Competency = require('../models/competencyModel');


// Get kompetensi user yang sedang login
exports.getMyCompetencies = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('competencies name email')
      .populate('competencies', 'name category description');
      
    res.json({
      message: 'Kompetensi berhasil diambil',
      competencies: user.competencies,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    next(err);
  }
};

// Tambah kompetensi baru (berdasarkan ID kompetensi yang tersedia)
exports.addCompetency = async (req, res, next) => {
  try {
    const { competencyId } = req.body;
    
    if (!competencyId) {
      return res.status(400).json({ message: 'ID kompetensi wajib diisi' });
    }

    // Cek apakah kompetensi exists dan active
    const competency = await Competency.findOne({ _id: competencyId, isActive: true });
    if (!competency) {
      return res.status(404).json({ message: 'Kompetensi tidak ditemukan atau tidak aktif' });
    }

    const user = await User.findById(req.user._id);
    
    // Cek apakah kompetensi sudah ada
    if (user.competencies.includes(competencyId)) {
      return res.status(409).json({ message: 'Kompetensi sudah ditambahkan sebelumnya' });
    }

    // Cek batas maksimal
    if (user.competencies.length >= 20) {
      return res.status(400).json({ message: 'Maksimal 20 kompetensi yang dapat ditambahkan' });
    }

    // Tambah kompetensi
    user.competencies.push(competencyId);
    await user.save();

    // Get updated user with populated competencies
    const updatedUser = await User.findById(req.user._id)
      .select('competencies')
      .populate('competencies', 'name category description');

    res.status(201).json({
      message: `Kompetensi "${competency.name}" berhasil ditambahkan`,
      competencies: updatedUser.competencies
    });

  } catch (err) {
    next(err);
  }
};

// Update/replace kompetensi berdasarkan index dengan kompetensi baru
exports.updateCompetency = async (req, res, next) => {
  try {
    const { index } = req.params;
    const { competencyId } = req.body;
    
    if (!competencyId) {
      return res.status(400).json({ message: 'ID kompetensi wajib diisi' });
    }

    // Cek apakah kompetensi exists dan active
    const competency = await Competency.findOne({ _id: competencyId, isActive: true });
    if (!competency) {
      return res.status(404).json({ message: 'Kompetensi tidak ditemukan atau tidak aktif' });
    }

    const user = await User.findById(req.user._id);
    const competencyIndex = parseInt(index);

    // Validasi index
    if (isNaN(competencyIndex) || competencyIndex < 0 || competencyIndex >= user.competencies.length) {
      return res.status(400).json({ message: 'Index kompetensi tidak valid' });
    }

    // Cek apakah kompetensi baru sudah ada (kecuali yang sedang diedit)
    const existingIndex = user.competencies.findIndex((comp, idx) => 
      idx !== competencyIndex && comp.toString() === competencyId
    );
    
    if (existingIndex !== -1) {
      return res.status(409).json({ message: 'Kompetensi sudah ada di daftar Anda' });
    }

    // Update kompetensi
    user.competencies[competencyIndex] = competencyId;
    await user.save();

    // Get updated user with populated competencies
    const updatedUser = await User.findById(req.user._id)
      .select('competencies')
      .populate('competencies', 'name category description');

    res.json({
      message: `Kompetensi berhasil diperbarui menjadi "${competency.name}"`,
      competencies: updatedUser.competencies
    });

  } catch (err) {
    next(err);
  }
};

// Hapus kompetensi berdasarkan index
exports.deleteCompetency = async (req, res, next) => {
  try {
    const { index } = req.params;
    
    const user = await User.findById(req.user._id)
      .populate('competencies', 'name category description');
    const competencyIndex = parseInt(index);

    // Validasi index
    if (isNaN(competencyIndex) || competencyIndex < 0 || competencyIndex >= user.competencies.length) {
      return res.status(400).json({ message: 'Index kompetensi tidak valid' });
    }

    // Simpan nama kompetensi yang akan dihapus
    const deletedCompetency = user.competencies[competencyIndex];
    
    // Hapus kompetensi
    user.competencies.splice(competencyIndex, 1);
    await user.save();

    // Get updated user with populated competencies
    const updatedUser = await User.findById(req.user._id)
      .select('competencies')
      .populate('competencies', 'name category description');

    res.json({
      message: `Kompetensi "${deletedCompetency.name}" berhasil dihapus`,
      competencies: updatedUser.competencies
    });

  } catch (err) {
    next(err);
  }
};

// Replace/set semua kompetensi sekaligus
exports.setCompetencies = async (req, res, next) => {
  try {
    const { competencyIds } = req.body;
    
    if (!Array.isArray(competencyIds)) {
      return res.status(400).json({ message: 'competencyIds harus berupa array' });
    }

    if (competencyIds.length > 20) {
      return res.status(400).json({ message: 'Maksimal 20 kompetensi yang dapat ditambahkan' });
    }

    // Validasi semua competency IDs
    const competencies = await Competency.find({
      _id: { $in: competencyIds },
      isActive: true
    });

    if (competencies.length !== competencyIds.length) {
      return res.status(400).json({ 
        message: 'Satu atau lebih kompetensi tidak ditemukan atau tidak aktif' 
      });
    }

    // Cek duplikasi
    const uniqueIds = [...new Set(competencyIds.map(id => id.toString()))];
    if (uniqueIds.length !== competencyIds.length) {
      return res.status(400).json({ message: 'Terdapat kompetensi yang duplikat' });
    }

    // Update kompetensi
    const user = await User.findById(req.user._id);
    user.competencies = competencyIds;
    await user.save();

    // Get updated user with populated competencies
    const updatedUser = await User.findById(req.user._id)
      .select('competencies')
      .populate('competencies', 'name category description');

    res.json({
      message: 'Semua kompetensi berhasil diperbarui',
      competencies: updatedUser.competencies
    });

  } catch (err) {
    next(err);
  }
};

// Get my profile
exports.getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash -resetToken -resetTokenExpires -verifyToken -verifyTokenExpires')
      .populate('competencies', 'name category description');
      
    res.json({
      message: 'Profil berhasil diambil',
      user: user
    });
  } catch (err) {
    next(err);
  }
};

// Get user profile by ID
exports.getUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('name email role competencies createdAt')
      .populate('competencies', 'name category description');
      
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }
    
    res.json({
      message: 'Profil user berhasil diambil',
      user: user
    });
  } catch (err) {
    next(err);
  }
};

// Search users by competency
exports.searchUsersByCompetency = async (req, res, next) => {
  try {
    const { competencyId } = req.query;
    
    if (!competencyId) {
      return res.status(400).json({ message: 'competencyId parameter wajib diisi' });
    }

    // Cek apakah kompetensi exists
    const competency = await Competency.findOne({ _id: competencyId, isActive: true });
    if (!competency) {
      return res.status(404).json({ message: 'Kompetensi tidak ditemukan atau tidak aktif' });
    }

    // Cari users yang memiliki kompetensi tersebut
    const users = await User.find({ 
      competencies: competencyId,
      _id: { $ne: req.user._id } // Exclude current user
    })
    .select('name email role competencies')
    .populate('competencies', 'name category description');

    res.json({
      message: `Ditemukan ${users.length} user dengan kompetensi ${competency.name}`,
      competency: {
        id: competency._id,
        name: competency.name,
        category: competency.category
      },
      users: users
    });
  } catch (err) {
    next(err);
  }
};
