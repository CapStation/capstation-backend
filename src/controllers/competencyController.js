const Competency = require('../models/competencyModel');

// Get all available competencies (for selection)
exports.getAllCompetencies = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    
    // Build filter
    const filter = { isActive: true };
    
    if (category) {
      filter.category = category;
    }
    
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const competencies = await Competency.find(filter)
      .select('name category description isActive createdAt')
      .sort({ category: 1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Competency.countDocuments(filter);

    res.json({
      message: 'Daftar kompetensi berhasil diambil',
      competencies,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (err) {
    next(err);
  }
};

// Get competencies grouped by category
exports.getCompetenciesByCategory = async (req, res, next) => {
  try {
    const competencies = await Competency.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          competencies: {
            $push: {
              id: '$_id',
              name: '$name',
              description: '$description'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      message: 'Kompetensi berdasarkan kategori berhasil diambil',
      categories: competencies
    });

  } catch (err) {
    next(err);
  }
};

// Create new competency (admin only)
exports.createCompetency = async (req, res, next) => {
  try {
    const { name, category, description } = req.body;

    // Check if competency already exists
    const existing = await Competency.findOne({ 
      name: { $regex: `^${name}$`, $options: 'i' } 
    });
    
    if (existing) {
      return res.status(409).json({ message: 'Kompetensi sudah ada' });
    }

    const competency = new Competency({
      name: name.trim(),
      category,
      description: description?.trim(),
      createdBy: req.user._id
    });

    await competency.save();

    res.status(201).json({
      message: 'Kompetensi berhasil dibuat',
      competency: {
        id: competency._id,
        name: competency.name,
        category: competency.category,
        description: competency.description
      }
    });

  } catch (err) {
    next(err);
  }
};

// Update competency (admin only)
exports.updateCompetency = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category, description, isActive } = req.body;

    const competency = await Competency.findById(id);
    if (!competency) {
      return res.status(404).json({ message: 'Kompetensi tidak ditemukan' });
    }

    // Check if new name already exists (exclude current competency)
    if (name && name !== competency.name) {
      const existing = await Competency.findOne({
        _id: { $ne: id },
        name: { $regex: `^${name}$`, $options: 'i' }
      });
      
      if (existing) {
        return res.status(409).json({ message: 'Nama kompetensi sudah ada' });
      }
    }

    // Update fields
    if (name) competency.name = name.trim();
    if (category) competency.category = category;
    if (description !== undefined) competency.description = description?.trim();
    if (isActive !== undefined) competency.isActive = isActive;

    await competency.save();

    res.json({
      message: 'Kompetensi berhasil diperbarui',
      competency: {
        id: competency._id,
        name: competency.name,
        category: competency.category,
        description: competency.description,
        isActive: competency.isActive
      }
    });

  } catch (err) {
    next(err);
  }
};

// Delete/deactivate competency (admin only)
exports.deleteCompetency = async (req, res, next) => {
  try {
    const { id } = req.params;

    const competency = await Competency.findById(id);
    if (!competency) {
      return res.status(404).json({ message: 'Kompetensi tidak ditemukan' });
    }

    // Soft delete (deactivate instead of removing)
    competency.isActive = false;
    await competency.save();

    res.json({
      message: 'Kompetensi berhasil dinonaktifkan',
      competency: {
        id: competency._id,
        name: competency.name,
        isActive: competency.isActive
      }
    });

  } catch (err) {
    next(err);
  }
};

// Get competency categories
exports.getCompetencyCategories = async (req, res, next) => {
  try {
    const categories = [
      'Programming Languages',
      'Web Development', 
      'Mobile Development',
      'Data Science',
      'UI/UX Design',
      'DevOps',
      'Database',
      'Cloud Computing',
      'Artificial Intelligence',
      'Cybersecurity',
      'Project Management',
      'Soft Skills',
      'Others'
    ];

    res.json({
      message: 'Kategori kompetensi berhasil diambil',
      categories
    });

  } catch (err) {
    next(err);
  }
};
