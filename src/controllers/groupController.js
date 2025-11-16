const Group = require('../models/groupModel');
const User = require('../models/userModel');
const { validationResult } = require('express-validator');

/**
 * Get all groups with pagination
 */
exports.getAllGroups = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status = 'active' } = req.query;
    const skip = (page - 1) * limit;

    const groups = await Group.find({ status })
      .populate('owner', 'name email role')
      .populate('members', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Group.countDocuments({ status });

    res.json({
      success: true,
      data: groups,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get group detail by ID
 */
exports.getGroupDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const group = await Group.findById(id)
      .populate('owner', 'name email role')
      .populate('members', 'name email role')
      .populate('invitations.user', 'name email')
      .populate('joinRequests.user', 'name email');

    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Grup tidak ditemukan' 
      });
    }

    res.json({
      success: true,
      data: group
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new group
 */
exports.createGroup = async (req, res, next) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, description, maxMembers, inviteEmails = [] } = req.body;
    const userId = req.user._id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan' 
      });
    }

    // Validate emails and auto-approve members (no invitations, direct members)
    const emailArray = Array.isArray(inviteEmails) ? inviteEmails : [];
    const invitedUsers = [];

    for (const email of emailArray) {
      const invitedUser = await User.findOne({ email: email.toLowerCase() });
      if (invitedUser && !invitedUsers.find(u => u._id.toString() === invitedUser._id.toString())) {
        invitedUsers.push(invitedUser);
      }
    }

    // Create group with invited users auto-added as members
    const newGroup = new Group({
      name,
      description: description || '',
      owner: userId,
      members: [userId, ...invitedUsers.map(u => u._id)],
      maxMembers: maxMembers || 2,
      status: 'active'
    });

    await newGroup.save();
    await newGroup.populate('owner', 'name email role');
    await newGroup.populate('members', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Grup berhasil dibuat',
      data: newGroup
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update group
 */
exports.updateGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, status, maxMembers } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Grup tidak ditemukan' 
      });
    }

    // Check if user is owner
    if (group.owner.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Anda tidak memiliki izin untuk mengubah grup ini' 
      });
    }

    // Update fields
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (status) group.status = status;
    if (maxMembers) group.maxMembers = maxMembers;

    await group.save();
    await group.populate('owner', 'name email role');
    await group.populate('members', 'name email role');

    res.json({
      success: true,
      message: 'Grup berhasil diperbarui',
      data: group
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete group
 */
exports.deleteGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Grup tidak ditemukan' 
      });
    }

    // Check if user is owner
    if (group.owner.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Anda tidak memiliki izin untuk menghapus grup ini' 
      });
    }

    await Group.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Grup berhasil dihapus'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Invite user to group
 */
exports.inviteMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const ownerUserId = req.user._id;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Grup tidak ditemukan' 
      });
    }

    // Check if user is owner
    if (group.owner.toString() !== ownerUserId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Hanya owner yang bisa mengundang anggota' 
      });
    }

    // Check if user already member
    if (group.members.includes(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'User sudah menjadi anggota grup' 
      });
    }

    // Check if user already invited
    const existingInvitation = group.invitations.find(inv => inv.user.toString() === userId);
    if (existingInvitation) {
      return res.status(400).json({ 
        success: false, 
        message: 'User sudah diundang sebelumnya' 
      });
    }

    // Check max members
    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({ 
        success: false, 
        message: 'Grup sudah penuh' 
      });
    }

    group.invitations.push({
      user: userId,
      status: 'pending'
    });

    await group.save();
    await group.populate('invitations.user', 'name email');

    res.json({
      success: true,
      message: 'Undangan berhasil dikirim',
      data: group
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Respond to invitation
 */
exports.respondInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { response } = req.body; // 'accepted' or 'rejected'
    const userId = req.user._id;

    if (!['accepted', 'rejected'].includes(response)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Response harus accepted atau rejected' 
      });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Grup tidak ditemukan' 
      });
    }

    const invitation = group.invitations.find(inv => inv.user.toString() === userId.toString());
    if (!invitation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Undangan tidak ditemukan' 
      });
    }

    if (response === 'accepted') {
      if (group.members.length >= group.maxMembers) {
        return res.status(400).json({ 
          success: false, 
          message: 'Grup sudah penuh' 
        });
      }
      group.members.push(userId);
      invitation.status = 'accepted';
    } else {
      invitation.status = 'rejected';
    }

    await group.save();
    await group.populate('members', 'name email role');

    res.json({
      success: true,
      message: `Undangan ${response}`,
      data: group
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Request to join group
 */
exports.requestJoin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Grup tidak ditemukan' 
      });
    }

    // Check if already member
    if (group.members.includes(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Anda sudah menjadi anggota grup' 
      });
    }

    // Check if already requested
    const existingRequest = group.joinRequests.find(req => req.user.toString() === userId);
    if (existingRequest) {
      return res.status(400).json({ 
        success: false, 
        message: 'Anda sudah mengajukan permintaan bergabung' 
      });
    }

    group.joinRequests.push({
      user: userId,
      status: 'pending'
    });

    await group.save();
    await group.populate('joinRequests.user', 'name email');

    res.json({
      success: true,
      message: 'Permintaan bergabung terkirim',
      data: group
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Respond to join request (Owner only)
 */
exports.respondJoinRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, response } = req.body; // 'accepted' or 'rejected'
    const ownerUserId = req.user._id;

    if (!['accepted', 'rejected'].includes(response)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Response harus accepted atau rejected' 
      });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Grup tidak ditemukan' 
      });
    }

    // Check if user is owner
    if (group.owner.toString() !== ownerUserId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Hanya owner yang bisa merespon permintaan' 
      });
    }

    const joinRequest = group.joinRequests.find(req => req.user.toString() === userId);
    if (!joinRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Permintaan tidak ditemukan' 
      });
    }

    if (response === 'accepted') {
      if (group.members.length >= group.maxMembers) {
        return res.status(400).json({ 
          success: false, 
          message: 'Grup sudah penuh' 
        });
      }
      group.members.push(userId);
      joinRequest.status = 'accepted';
    } else {
      joinRequest.status = 'rejected';
    }

    await group.save();
    await group.populate('members', 'name email role');

    res.json({
      success: true,
      message: `Permintaan ${response}`,
      data: group
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Remove member from group (Owner only)
 */
exports.removeMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const ownerUserId = req.user._id;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Grup tidak ditemukan' 
      });
    }

    // Check if user is owner
    if (group.owner.toString() !== ownerUserId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Hanya owner yang bisa menghapus anggota' 
      });
    }

    // Check if user is member
    if (!group.members.includes(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'User bukan anggota grup' 
      });
    }

    group.members = group.members.filter(id => id.toString() !== userId);
    await group.save();
    await group.populate('members', 'name email role');

    res.json({
      success: true,
      message: 'Anggota berhasil dihapus',
      data: group
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Leave group (Member only)
 */
exports.leaveGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Grup tidak ditemukan' 
      });
    }

    // Check if user is owner
    if (group.owner.toString() === userId.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Owner tidak bisa meninggalkan grup. Hapus grup jika ingin keluar.' 
      });
    }

    // Check if user is member
    if (!group.members.includes(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Anda bukan anggota grup' 
      });
    }

    group.members = group.members.filter(id => id.toString() !== userId);
    await group.save();
    await group.populate('members', 'name email role');

    res.json({
      success: true,
      message: 'Anda berhasil meninggalkan grup',
      data: group
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get user groups
 */
exports.getUserGroups = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const groups = await Group.find({
      $or: [
        { members: userId },
        { owner: userId }
      ]
    })
      .populate('owner', 'name email')
      .populate('members', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Group.countDocuments({
      $or: [
        { members: userId },
        { owner: userId }
      ]
    });

    res.json({
      success: true,
      data: groups,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (err) {
    next(err);
  }
};