const Capstone = require('../models/capstoneModel');

// Membuat capstone baru
exports.createCapstone = async (req, res, next) => {
  try {
    const { title, description, category, year, members } = req.body;
    const capstone = new Capstone({
      title,
      description,
      category,
      year,
      owner: req.user._id, 
      members
    });
    await capstone.save();
    res.status(201).json(capstone);
  } catch (err) {
    next(err);
  }
};

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
