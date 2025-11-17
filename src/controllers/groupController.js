// groupController.js
const Group = require('../models/groupModel');
const User = require('../models/userModel');

class GroupController {

  /**
   * Create new group
   * POST /api/groups
   */
    /**
   * Create new group
   * POST /api/groups
   */
  async createGroup(req, res) {
    try {
      const {
        name,
        description,
        maxMembers = 5,
        inviteEmails = [],
      } = req.body;

      const userId = req.user?._id;

      // Cek autentikasi
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User tidak terautentikasi',
          data: null,
        });
      }

      // 🔎 Validasi nama grup
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Nama grup harus diisi',
          data: null,
        });
      }

      // Cek apakah user sudah punya grup aktif sebagai owner
      const existingGroup = await Group.findOne({
        owner: userId,
        isActive: true,
      });

      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message:
            'User sudah memiliki grup aktif. Satu user hanya bisa memiliki satu grup.',
          data: null,
        });
      }

      // Mulai dari owner sebagai anggota pertama
      let memberIds = [userId.toString()];

      // 📧 Kalau ada inviteEmails, convert ke userId dan gabungkan
      if (Array.isArray(inviteEmails) && inviteEmails.length > 0) {
        const normalized = inviteEmails
          .map((e) => String(e).toLowerCase().trim())
          .filter(Boolean);

        if (normalized.length > 0) {
          const invitedUsers = await User.find({
            email: { $in: normalized },
          }).select('_id email');

          const invitedIds = invitedUsers.map((u) => u._id.toString());
          const foundEmails = invitedUsers.map((u) =>
            u.email.toLowerCase()
          );

          // (Opsional) kalau mau error kalau ada email yang belum terdaftar:
          const missing = normalized.filter(
            (e) => !foundEmails.includes(e)
          );
          if (missing.length > 0) {
            return res.status(400).json({
              success: false,
              message: `Beberapa email tidak ditemukan: ${missing.join(
                ', '
              )}`,
              data: null,
            });
          }

          // Gabungkan owner + undangan, hilangkan duplikat
          memberIds = [...new Set([...memberIds, ...invitedIds])];
        }
      }

      // 🚦 Jangan sampai melebihi maxMembers
      if (memberIds.length > maxMembers) {
        return res.status(400).json({
          success: false,
          message: `Jumlah anggota (${memberIds.length}) melebihi batas maksimal (${maxMembers})`,
          data: null,
        });
      }

      // Buat grup baru
      const newGroup = new Group({
        name,
        description,
        owner: userId,
        maxMembers,
        members: memberIds, // owner + undangan
      });

      await newGroup.save();

      await newGroup.populate([
        { path: 'owner', select: 'name email role' },
        { path: 'members', select: 'name email role' },
      ]);

      return res.status(201).json({
        success: true,
        message: 'Grup berhasil dibuat',
        data: newGroup,
      });
    } catch (error) {
      console.error('Create Group Error:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
        data: null,
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

      // Build query - isActive can be true or undefined (for backward compatibility)
      let query = {
        $or: [
          { isActive: true },
          { isActive: { $exists: false } }
        ]
      };
      
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
          data: null,
        });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Grup tidak ditemukan',
          data: null,
        });
      }

      // Cek owner manual
      if (group.owner.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Hanya owner yang bisa mengupdate grup',
          data: null,
        });
      }

      // Update fields
      if (name) group.name = name;
      if (description !== undefined) group.description = description;

      if (members) {
        const memberUsers = await User.find({ _id: { $in: members } });
        if (memberUsers.length !== members.length) {
          return res.status(400).json({
            success: false,
            message: 'Beberapa member tidak ditemukan',
            data: null,
          });
        }
        group.members = members;
      }

      await group.save();

      await group.populate([
        { path: 'owner', select: 'name email role' },
        { path: 'members', select: 'name email role' },
      ]);

      return res.json({
        success: true,
        message: 'Grup berhasil diupdate',
        data: group,
      });
    } catch (error) {
      console.error('Update Group Error:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  /**
   * Get available users that can be invited to the group (not already members)
   * GET /api/groups/:groupId/available-users
   */
  async getAvailableUsers(req, res, next) {
    try {
      const { groupId } = req.params;
      
      const group = await Group.findById(groupId).populate('members');
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Grup tidak ditemukan',
          data: null
        });
      }

      // Get all users except those already in the group and the owner
      const memberIds = group.members.map(member => member._id.toString());
      // owner may be populated (object) or just ObjectId - handle both
      const ownerId = group.owner && (group.owner._id ? group.owner._id.toString() : group.owner.toString());
      
      const availableUsers = await User.find({
        _id: { 
          $nin: [...memberIds, ownerId]
        }
      }).select('_id name email role');

      res.json({
        success: true,
        data: availableUsers
      });
    } catch (error) {
      console.error('Get Available Users Error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  /**
   * Invite a user to join the group
   * POST /api/groups/:groupId/invite
   */
  async inviteMember(req, res) {
    try {
      const { groupId } = req.params;
      const { userId } = req.body;
      const requestUserId = req.user?._id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
          data: null,
        });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Grup tidak ditemukan',
          data: null,
        });
      }

      // Hanya owner yang boleh mengundang
      if (group.owner.toString() !== requestUserId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Hanya group owner yang bisa mengirim undangan',
          data: null,
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User tidak ditemukan',
          data: null,
        });
      }

      // Cek apakah sudah jadi member (pakai toString karena ObjectId)
      const alreadyMember = group.members.some(
        (m) => m.toString() === userId.toString()
      );

      if (alreadyMember) {
        return res.status(400).json({
          success: false,
          message: 'User sudah merupakan anggota grup ini',
          data: null,
        });
      }

      // ➕ Tambahkan user ke members
      group.members.push(userId);
      await group.save();

      // Populate dan kirim balik
      await group.populate([
        { path: 'members', select: 'name email role' },
        { path: 'owner', select: 'name email role' },
      ]);

      return res.json({
        success: true,
        message: 'Anggota berhasil ditambahkan ke grup',
        data: group,
      });
    } catch (error) {
      console.error('Invite Member Error:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

}

module.exports = GroupController;

