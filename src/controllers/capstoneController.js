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
