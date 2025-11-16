const Group = require('../models/groupModel');
const User = require('../models/userModel');

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

/**
 * Get available users that can be invited to the group (not already members)
 */
exports.getAvailableUsers = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const group = await Group.findById(id).populate('members');
    if (!group) {
      return res.status(404).json({ message: 'Grup tidak ditemukan' });
    }

    // Get all users except those already in the group and the owner
    const memberIds = group.members.map(member => member._id.toString());
    const ownerId = group.owner._id.toString();
    
    const availableUsers = await User.find({
      _id: { 
        $nin: [...memberIds, ownerId]
      }
    }).select('_id name email role');

    res.json({
      success: true,
      data: availableUsers
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Invite a user to join the group
 */
exports.inviteMember = async (req, res, next) => {
  try {
    const { id: groupId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Grup tidak ditemukan' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Check if user is already a member
    if (group.members.includes(userId)) {
      return res.status(400).json({ message: 'User sudah merupakan anggota grup ini' });
    }

    // Add user to group members
    group.members.push(userId);
    await group.save();

    // Populate and return updated group
    await group.populate([
      { path: 'members', select: 'name email role' },
      { path: 'owner', select: 'name email role' }
    ]);

    res.json({
      success: true,
      message: 'Anggota berhasil ditambahkan ke grup',
      data: group
    });
  } catch (err) {
    next(err);
  }
};

