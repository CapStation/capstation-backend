const Capstone = require('../models/capstoneModel');

exports.getDashboardSummary = async (req, res, next) => {
  try {
    const totalProjects = await Capstone.countDocuments();

    const perCategory = await Capstone.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { category: '$_id', count: 1, _id: 0 } }
    ]);

    const perStatus = await Capstone.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } }
    ]);

    const latest = await Capstone.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title category status createdAt')
      .populate('owner', 'name');

    res.json({ totalProjects, perCategory, perStatus, latest });
  } catch (err) {
    next(err);
  }
};
