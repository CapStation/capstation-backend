const Group = require('../models/groupModel');

exports.getAllGroups = async (req, res, next) => {
  try {
    const groups = await Group.find()
      .populate('capstone', 'title category status year')
      .populate('owner', 'name email role')
      .populate('members', 'name email role');

    res.json(groups);
  } catch (err) {
    next(err);
  }
};

exports.getGroupDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const group = await Group.findById(id)
      .populate('capstone', 'title description category status year')
      .populate('members', 'name email role');

    if (!group) return res.status(404).json({ message: 'Group not found' });

    res.json(group);
  } catch (err) {
    next(err);
  }
};

