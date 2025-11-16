const Group = require('../models/groupModel');
const User = require('../models/userModel');

/**
 * GroupController Class
 * Mengelola HTTP requests untuk group-related endpoints
 */
class GroupController {
  
  /**
   * Create new group
   * POST /api/groups
   */
  async createGroup(req, res) {
    try {
      const { name, description, members = [] } = req.body;
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User tidak terautentikasi',
          data: null
        });
      }

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Nama grup harus diisi',
          data: null
        });
      }

      // Check apakah user sudah punya grup
      const existingGroup = await Group.findOne({ owner: userId, isActive: true });
      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: 'User sudah memiliki grup aktif. Satu user hanya bisa memiliki satu grup.',
          data: null
        });
      }

      // Validate members exist
      let validMembers = [];
      if (members.length > 0) {
        const memberUsers = await User.find({ _id: { $in: members } });
        validMembers = memberUsers.map(user => user._id);
        
        if (memberUsers.length !== members.length) {
          return res.status(400).json({
            success: false,
            message: 'Beberapa member tidak ditemukan',
            data: null
          });
        }
      }

      // Create group
      const newGroup = new Group({
        name,
        description,
        owner: userId,
        members: validMembers // tambah otomatis owner otomatis - pre-save middleware
      });

      await newGroup.save();
      
      await newGroup.populate([
        { path: 'owner', select: 'name email' },
        { path: 'members', select: 'name email' }
      ]);

      res.status(201).json({
        success: true,
        message: 'Grup berhasil dibuat',
        data: newGroup
      });

    } catch (error) {
      console.error('Create Group Error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get user's group (owner or member)
   * GET /api/groups/my
   */
  async getMyGroup(req, res) {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User tidak terautentikasi',
          data: null
        });
      }

      // Find group where user is owner or member
      const group = await Group.findOne({
        $and: [
          { isActive: true },
          {
            $or: [
              { owner: userId },
              { members: userId }
            ]
          }
        ]
      }).populate([
        { path: 'owner', select: 'name email role' },
        { path: 'members', select: 'name email role' },
        { path: 'projects', select: 'title description tema status createdAt' }
      ]);

      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'User belum bergabung dalam grup manapun',
          data: null
        });
      }

      res.json({
        success: true,
        message: 'Data grup berhasil diambil',
        data: group
      });

    } catch (error) {
      console.error('Get My Group Error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get group by ID
   * GET /api/groups/:groupId
   */
  async getGroupById(req, res) {
    try {
      const { groupId } = req.params;
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User tidak terautentikasi',
          data: null
        });
      }

      const group = await Group.findById(groupId)
        .populate([
          { path: 'owner', select: 'name email role' },
          { path: 'members', select: 'name email role' },
          { path: 'projects', select: 'title description tema status createdAt members', 
            populate: { path: 'members', select: 'name email' } 
          }
        ]);

      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Grup tidak ditemukan',
          data: null
        });
      }

      res.json({
        success: true,
        message: 'Detail grup berhasil diambil',
        data: group
      });

    } catch (error) {
      console.error('Get Group By ID Error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Get all groups (for admin or browse)
   * GET /api/groups
   */
  async getAllGroups(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;

      // Build query
      let query = { isActive: true };
      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }

      const skip = (page - 1) * limit;
      
      const [groups, total] = await Promise.all([
        Group.find(query)
          .populate([
            { path: 'owner', select: 'name email' },
            { path: 'members', select: 'name email' }
          ])
          .skip(skip)
          .limit(parseInt(limit))
          .sort({ createdAt: -1 }),
        Group.countDocuments(query)
      ]);

      res.json({
        success: true,
        message: 'Data grup berhasil diambil',
        data: groups,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      });

    } catch (error) {
      console.error('Get All Groups Error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Update group (only owner)
   * PUT /api/groups/:groupId
   */
  async updateGroup(req, res) {
    try {
      const { groupId } = req.params;
      const { name, description, members } = req.body;
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User tidak terautentikasi',
          data: null
        });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Grup tidak ditemukan',
          data: null
        });
      }

      // Check ownership
      if (!group.isOwner(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Hanya owner yang bisa mengupdate grup',
          data: null
        });
      }

      // Update fields
      if (name) group.name = name;
      if (description !== undefined) group.description = description;
      if (members) {
        // Validate members exist
        const memberUsers = await User.find({ _id: { $in: members } });
        if (memberUsers.length !== members.length) {
          return res.status(400).json({
            success: false,
            message: 'Beberapa member tidak ditemukan',
            data: null
          });
        }
        group.members = members; // Owner akan ditambahkan otomatis via pre-save
      }

      await group.save();
      
      await group.populate([
        { path: 'owner', select: 'name email' },
        { path: 'members', select: 'name email' }
      ]);

      res.json({
        success: true,
        message: 'Grup berhasil diupdate',
        data: group
      });

    } catch (error) {
      console.error('Update Group Error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

}

module.exports = GroupController;

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

