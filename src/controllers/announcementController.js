const Announcement = require('../models/announcementModel');
const { validationResult } = require('express-validator');

/**
 * Create a new announcement (Admin/Dosen only)
 */
exports.createAnnouncement = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { title, content, category, targetAudience, status, isImportant } = req.body;
    
    const announcement = new Announcement({
      title,
      content,
      category: category || 'pengumuman',
      targetAudience: targetAudience || 'semua',
      status: status || 'published',
      isImportant: isImportant || false,
      createdBy: req.user._id
    });

    await announcement.save();
    await announcement.populate('createdBy', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Pengumuman berhasil dibuat',
      data: announcement
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all announcements with filters
 */
exports.getAnnouncements = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, sort = 'newest', search } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { status: 'published' };
    
    if (category && category !== 'semua') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // Determine sort order
    let sortOption = { createdAt: -1 }; // default: newest
    if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'important') {
      sortOption = { isImportant: -1, createdAt: -1 };
    }

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'name email role')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Announcement.countDocuments(filter);

    res.json({
      success: true,
      data: announcements,
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
 * Get announcement detail by ID
 */
exports.getAnnouncementDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const announcement = await Announcement.findById(id).populate('createdBy', 'name email role');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Pengumuman tidak ditemukan'
      });
    }

    // Track view and mark as read if user is logged in
    if (userId) {
      const alreadyRead = announcement.readBy.some(r => r.user.toString() === userId.toString());
      if (!alreadyRead) {
        announcement.readBy.push({ user: userId });
      }
      announcement.viewCount += 1;
      await announcement.save();
    } else {
      announcement.viewCount += 1;
      await announcement.save();
    }

    res.json({
      success: true,
      data: announcement
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update announcement (Admin/Dosen only - creator only)
 */
exports.updateAnnouncement = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { title, content, category, targetAudience, status, isImportant } = req.body;
    const userId = req.user._id;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Pengumuman tidak ditemukan'
      });
    }

    // Check if user is the creator
    if (announcement.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk mengedit pengumuman ini'
      });
    }

    // Update fields
    if (title) announcement.title = title;
    if (content) announcement.content = content;
    if (category) announcement.category = category;
    if (targetAudience) announcement.targetAudience = targetAudience;
    if (status) announcement.status = status;
    if (isImportant !== undefined) announcement.isImportant = isImportant;

    await announcement.save();
    await announcement.populate('createdBy', 'name email role');

    res.json({
      success: true,
      message: 'Pengumuman berhasil diperbarui',
      data: announcement
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete announcement (Admin/Dosen only - creator only)
 */
exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Pengumuman tidak ditemukan'
      });
    }

    // Check if user is the creator
    if (announcement.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk menghapus pengumuman ini'
      });
    }

    await Announcement.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Pengumuman berhasil dihapus'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get announcements for dashboard (latest and unread)
 */
exports.getDashboardAnnouncements = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const limit = 5;

    const announcements = await Announcement.find({ status: 'published' })
      .populate('createdBy', 'name email role')
      .sort({ isImportant: -1, createdAt: -1 })
      .limit(limit);

    const annotated = announcements.map(announcement => ({
      ...announcement.toObject(),
      isUnread: userId ? !announcement.readBy.some(r => r.user.toString() === userId.toString()) : false
    }));

    res.json({
      success: true,
      data: annotated
    });
  } catch (err) {
    next(err);
  }
};
