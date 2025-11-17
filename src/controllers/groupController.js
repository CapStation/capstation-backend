// src/controllers/groupController.js
const Group = require("../models/groupModel");
const User = require("../models/userModel");

class GroupController {
  /**
   * Create new group
   * POST /api/groups
   */
  async createGroup(req, res) {
    try {
      const {
        name,
        description,
        members = [],
        maxMembers = 5,
        inviteEmails = [],
      } = req.body;

      const userId = req.user?._id;

      // Validasi inviteEmails harus array
      if (inviteEmails && !Array.isArray(inviteEmails)) {
        return res.status(400).json({
          success: false,
          message: "inviteEmails harus berupa array",
          data: null,
        });
      }

      // Validasi maxMembers (1–100, integer)
      const maxMembersInt = parseInt(maxMembers, 10);
      if (
        !Number.isInteger(maxMembersInt) ||
        maxMembersInt < 1 ||
        maxMembersInt > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Jumlah maksimal anggota harus antara 1 dan 100",
          data: null,
        });
      }

      // Cek autentikasi
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User tidak terautentikasi",
          data: null,
        });
      }

      // Validasi nama grup
      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Nama grup harus diisi",
          data: null,
        });
      }

      // Check apakah user sudah punya grup aktif sebagai owner
      const existingGroup = await Group.findOne({
        owner: userId,
        isActive: true,
      });
      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message:
            "User sudah memiliki grup aktif. Satu user hanya bisa memiliki satu grup.",
          data: null,
        });
      }

      // Validate and convert inviteEmails to user IDs
      let validMembers = [];

      // Jika pakai inviteEmails
      if (inviteEmails && inviteEmails.length > 0) {
        console.log("📧 Processing invite emails:", inviteEmails);

        const normalized = inviteEmails.map((e) => e.toLowerCase());
        const invitedUsers = await User.find({
          email: { $in: normalized },
        });

        console.log(
          "✅ Found users for emails:",
          invitedUsers.map((u) => u.email)
        );

        validMembers = invitedUsers.map((user) => user._id);

        if (invitedUsers.length !== inviteEmails.length) {
          const foundEmails = invitedUsers.map((u) => u.email.toLowerCase());
          const missing = normalized.filter(
            (e) => !foundEmails.includes(e)
          );
          if (missing.length > 0) {
            return res.status(400).json({
              success: false,
              message: `Beberapa email tidak ditemukan: ${missing.join(
                ", "
              )}`,
              data: null,
            });
          }
        }

        // Cek apakah user yang diinvite sudah punya grup aktif (sebagai owner atau member)
        const invitedIds = invitedUsers.map((u) => u._id);

        const usersWithGroup = await Group.find({
          $and: [
            { isActive: true },
            {
              $or: [
                { owner: { $in: invitedIds } }, // User adalah owner
                { members: { $in: invitedIds } }, // User adalah member
              ],
            },
          ],
        })
          .populate("owner", "email")
          .populate("members", "email");

        const usersWithGroupEmails = usersWithGroup.reduce((emails, group) => {
          invitedUsers.forEach((invitedUser) => {
            const isOwner =
              group.owner &&
              group.owner._id.toString() === invitedUser._id.toString();
            const isMember = group.members.some(
              (m) => m._id.toString() === invitedUser._id.toString()
            );
            if (isOwner || isMember) {
              emails.push(invitedUser.email);
            }
          });
          return emails;
        }, []);

        if (usersWithGroupEmails.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Pengguna berikut sudah memiliki grup aktif: ${[
              ...new Set(usersWithGroupEmails),
            ].join(
              ", "
            )}. Satu pengguna hanya bisa memiliki satu grup.`,
            data: null,
          });
        }
      }
      // Jika pakai members langsung (by userId)
      else if (members.length > 0) {
        const memberUsers = await User.find({ _id: { $in: members } });
        validMembers = memberUsers.map((user) => user._id);

        if (memberUsers.length !== members.length) {
          return res.status(400).json({
            success: false,
            message: "Beberapa member tidak ditemukan",
            data: null,
          });
        }
      }

      console.log("👥 Valid members to add:", validMembers);

      // Jangan sampai melebihi maxMembers (owner + invited members)
      const totalMembers = validMembers.length + 1; // +1 untuk owner
      if (totalMembers > maxMembersInt) {
        return res.status(400).json({
          success: false,
          message: `Jumlah anggota (${totalMembers}) melebihi batas maksimal (${maxMembersInt})`,
          data: null,
        });
      }

      // Buat grup baru
      const newGroup = new Group({
        name,
        description,
        owner: userId,
        members: validMembers,
        maxMembers: maxMembersInt,
      });

      await newGroup.save();

      await newGroup.populate([
        { path: "owner", select: "name email role" },
        { path: "members", select: "name email role" },
      ]);

      console.log(
        "✅ Group created with members:",
        newGroup.members.map((m) => m.email)
      );

      return res.status(201).json({
        success: true,
        message: "Grup berhasil dibuat",
        data: newGroup,
      });
    } catch (error) {
      console.error("Create Group Error:", error);
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
          message: "User tidak terautentikasi",
          data: null,
        });
      }

      const group = await Group.findOne({
        $and: [
          { isActive: true },
          {
            $or: [{ owner: userId }, { members: userId }],
          },
        ],
      }).populate([
        { path: "owner", select: "name email role" },
        { path: "members", select: "name email role" },
        { path: "projects", select: "title description tema status createdAt" },
      ]);

      if (!group) {
        return res.status(404).json({
          success: false,
          message: "User belum bergabung dalam grup manapun",
          data: null,
        });
      }

      res.json({
        success: true,
        message: "Data grup berhasil diambil",
        data: group,
      });
    } catch (error) {
      console.error("Get My Group Error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
        data: null,
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
          message: "User tidak terautentikasi",
          data: null,
        });
      }

      const group = await Group.findById(groupId).populate([
        { path: "owner", select: "name email role" },
        { path: "members", select: "name email role" },
        {
          path: "projects",
          select: "title description tema status createdAt members",
          populate: { path: "members", select: "name email" },
        },
      ]);

      if (!group) {
        return res.status(404).json({
          success: false,
          message: "Grup tidak ditemukan",
          data: null,
        });
      }

      res.json({
        success: true,
        message: "Detail grup berhasil diambil",
        data: group,
      });
    } catch (error) {
      console.error("Get Group By ID Error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  /**
   * Get all groups
   * GET /api/groups
   */
  async getAllGroups(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;

      let query = {
        $or: [{ isActive: true }, { isActive: { $exists: false } }],
      };

      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const skip = (page - 1) * limit;

      const [groups, total] = await Promise.all([
        Group.find(query)
          .populate([
            { path: "owner", select: "name email" },
            { path: "members", select: "name email" },
          ])
          .skip(skip)
          .limit(parseInt(limit))
          .sort({ createdAt: -1 }),
        Group.countDocuments(query),
      ]);

      res.json({
        success: true,
        message: "Data grup berhasil diambil",
        data: groups,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.error("Get All Groups Error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
        data: null,
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
          message: "User tidak terautentikasi",
          data: null,
        });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: "Grup tidak ditemukan",
          data: null,
        });
      }

      if (group.owner.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Hanya owner yang bisa mengupdate grup",
          data: null,
        });
      }

      if (name) group.name = name;
      if (description !== undefined) group.description = description;

      if (members) {
        const memberUsers = await User.find({ _id: { $in: members } });
        if (memberUsers.length !== members.length) {
          return res.status(400).json({
            success: false,
            message: "Beberapa member tidak ditemukan",
            data: null,
          });
        }
        group.members = members;
      }

      await group.save();

      await group.populate([
        { path: "owner", select: "name email role" },
        { path: "members", select: "name email role" },
      ]);

      return res.json({
        success: true,
        message: "Grup berhasil diupdate",
        data: group,
      });
    } catch (error) {
      console.error("Update Group Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  /**
   * Get available users that can be invited to the group
   * GET /api/groups/:groupId/available-users
   */
  async getAvailableUsers(req, res) {
    try {
      const { groupId } = req.params;

      const group = await Group.findById(groupId).populate("members");
      if (!group) {
        return res.status(404).json({
          success: false,
          message: "Grup tidak ditemukan",
          data: null,
        });
      }

      // IDs member di grup ini
      const memberIds = group.members.map((member) =>
        member._id.toString()
      );

      // owner bisa berupa object atau ObjectId
      const ownerId =
        group.owner &&
        (group.owner._id
          ? group.owner._id.toString()
          : group.owner.toString());

      const currentGroupExclusionIds = memberIds.includes(ownerId)
        ? memberIds
        : [...memberIds, ownerId];

      // Cari semua user yang sudah punya grup aktif lain
      const usersWithGroups = await Group.find({
        isActive: true,
        _id: { $ne: groupId },
      }).select("owner members");

      const usersWithGroupIds = new Set();
      usersWithGroups.forEach((g) => {
        if (g.owner) {
          usersWithGroupIds.add(g.owner.toString());
        }
        if (g.members && Array.isArray(g.members)) {
          g.members.forEach((memberId) => {
            usersWithGroupIds.add(memberId.toString());
          });
        }
      });

      const allExclusionIds = [
        ...currentGroupExclusionIds,
        ...Array.from(usersWithGroupIds),
      ];

      const availableUsers = await User.find({
        _id: {
          $nin: allExclusionIds,
        },
      }).select("_id name email role");

      res.json({
        success: true,
        data: availableUsers,
      });
    } catch (error) {
      console.error("Get Available Users Error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
        data: null,
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
          message: "User ID wajib diisi",
          data: null,
        });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: "Grup tidak ditemukan",
          data: null,
        });
      }

      // Hanya owner yang boleh mengundang
      if (group.owner.toString() !== requestUserId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Hanya group owner yang bisa mengirim undangan",
          data: null,
        });
      }

      // Cek batas maksimal anggota
      const effectiveMaxMembers = group.maxMembers || 5;
      if (group.members.length >= effectiveMaxMembers) {
        return res.status(400).json({
          success: false,
          message: `Grup sudah mencapai batas maksimal anggota (${effectiveMaxMembers})`,
          data: null,
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User tidak ditemukan",
          data: null,
        });
      }

      // Sudah jadi member?
      const alreadyMember = group.members.some(
        (m) => m.toString() === userId.toString()
      );

      if (alreadyMember) {
        return res.status(400).json({
          success: false,
          message: "User sudah merupakan anggota grup ini",
          data: null,
        });
      }

      // Cek apakah user sudah punya grup aktif (sebagai owner ATAU member)
      const userExistingGroup = await Group.findOne({
        $and: [
          { isActive: true },
          {
            $or: [{ owner: userId }, { members: userId }],
          },
        ],
      });

      if (userExistingGroup) {
        return res.status(400).json({
          success: false,
          message:
            "User sudah memiliki grup aktif. Satu user hanya bisa memiliki satu grup.",
          data: null,
        });
      }

      // Tambahkan user ke members
      group.members.push(userId);
      await group.save();

      await group.populate([
        { path: "members", select: "name email role" },
        { path: "owner", select: "name email role" },
      ]);

      return res.json({
        success: true,
        message: "Anggota berhasil ditambahkan ke grup",
        data: group,
      });
    } catch (error) {
      console.error("Invite Member Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  /**
   * Remove a member from group (owner only)
   * POST /api/groups/:groupId/remove-member
   */
  async removeMember(req, res) {
    try {
      const { groupId } = req.params;
      const { userId } = req.body;
      const requestUserId = req.user?._id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
          data: null,
        });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: "Grup tidak ditemukan",
          data: null,
        });
      }

      // Hanya owner yang boleh remove member
      if (group.owner.toString() !== requestUserId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Hanya group owner yang bisa menghapus anggota",
          data: null,
        });
      }

      // Cek apakah user adalah owner
      if (userId.toString() === group.owner.toString()) {
        return res.status(400).json({
          success: false,
          message: "Tidak bisa menghapus owner dari grup",
          data: null,
        });
      }

      // Hapus user dari members
      group.members = group.members.filter(
        (m) => m.toString() !== userId.toString()
      );
      await group.save();

      await group.populate([
        { path: "members", select: "name email role" },
        { path: "owner", select: "name email role" },
      ]);

      return res.json({
        success: true,
        message: "Anggota berhasil dihapus dari grup",
        data: group,
      });
    } catch (error) {
      console.error("Remove Member Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  /**
   * Leave group
   * POST /api/groups/:groupId/leave
   */
  async leaveGroup(req, res) {
    try {
      const { groupId } = req.params;
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User tidak terautentikasi",
          data: null,
        });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: "Grup tidak ditemukan",
          data: null,
        });
      }

      const isOwner = group.owner.toString() === userId.toString();
      const isMember = group.members.some(
        (m) => m.toString() === userId.toString()
      );

      if (!isOwner && !isMember) {
        return res.status(400).json({
          success: false,
          message: "User bukan anggota grup ini",
          data: null,
        });
      }

      // Jika owner yang leave → hapus grup
      if (isOwner) {
        await Group.findByIdAndDelete(groupId);
        return res.json({
          success: true,
          message:
            "Grup berhasil dihapus karena owner meninggalkan grup",
        });
      }

      // Jika member biasa → remove dari members
      group.members = group.members.filter(
        (m) => m.toString() !== userId.toString()
      );
      await group.save();

      await group.populate([
        { path: "members", select: "name email role" },
        { path: "owner", select: "name email role" },
      ]);

      return res.json({
        success: true,
        message: "Berhasil keluar dari grup",
        data: group,
      });
    } catch (error) {
      console.error("Leave Group Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  /**
   * Delete group (owner only)
   * DELETE /api/groups/:groupId
   */
  async deleteGroup(req, res) {
    try {
      const { groupId } = req.params;
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User tidak terautentikasi",
          data: null,
        });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: "Grup tidak ditemukan",
          data: null,
        });
      }

      if (group.owner.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Hanya owner yang bisa menghapus grup",
          data: null,
        });
      }

      await Group.findByIdAndDelete(groupId);

      return res.json({
        success: true,
        message: "Grup berhasil dihapus",
        data: null,
      });
    } catch (error) {
      console.error("Delete Group Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }
}

// Export instance, bukan class
module.exports = new GroupController();
