const Document = require('../models/Document');
const Project = require('../models/Project');

/**
 * Middleware untuk memastikan user memiliki akses ke dokumen/project
 */

exports.requireProjectMembership = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User tidak terautentikasi',
        data: null
      });
    }

    // Get document with project info
    const document = await Document.findById(documentId).populate('project');
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Dokumen tidak ditemukan',
        data: null
      });
    }

    const project = document.project;
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project terkait dokumen tidak ditemukan',
        data: null
      });
    }

    // Check authorization
    const userIdString = userId.toString();
    const ownerIdString = project.owner.toString();
    const memberIdStrings = project.members.map(m => m.toString());
    
    const isOwner = userIdString === ownerIdString;
    const isMember = memberIdStrings.includes(userIdString);
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isMember && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Tidak memiliki izin untuk mengakses dokumen ini. Hanya members project yang diizinkan.',
        data: null
      });
    }

    // Store project info for use in controller
    req.projectInfo = {
      project,
      isOwner,
      isMember,
      isAdmin
    };

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error checking document access: ${error.message}`,
      data: null
    });
  }
};

/**
 * Check if user can create documents for a specific project
 */
exports.requireProjectMembershipForCreate = async (req, res, next) => {
  try {
    const { project: projectId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User tidak terautentikasi',
        data: null
      });
    }

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID diperlukan',
        data: null
      });
    }

    // Get project with group info
    const project = await Project.findById(projectId).populate('group');
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project tidak ditemukan',
        data: null
      });
    }

    // Check authorization via group membership
    const userIdString = userId.toString();
    const ownerIdString = project.owner.toString();
    const memberIdStrings = project.members.map(m => m.toString());
    
    const isOwner = userIdString === ownerIdString;
    const isMember = memberIdStrings.includes(userIdString);
    const isAdmin = req.user.role === 'admin';
    
    // Additional check: is user member of the project's group?
    let isGroupMember = false;
    if (project.group) {
      const groupMemberStrings = project.group.members.map(m => m.toString());
      isGroupMember = groupMemberStrings.includes(userIdString);
    }
    
    if (!isOwner && !isMember && !isGroupMember && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Tidak memiliki izin untuk mengunggah dokumen ke project ini. Hanya owner, members project, atau members group yang diizinkan.',
        data: null
      });
    }

    // Store project info for use in controller
    req.projectInfo = {
      project,
      isOwner,
      isMember,
      isAdmin
    };

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error checking project access: ${error.message}`,
      data: null
    });
  }
};