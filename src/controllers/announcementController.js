//announcementController.js
const Announcement = require('../models/announcementModel');

// create announcement
exports.createAnnouncement = async (req, res, next) => {
    try {
        const { title, content } = req.body;
        const announcement = new Announcement({
            title,
            content,
            createdBy: req.user._id
        });
        await announcement.save();
        res.status(201).json(announcement);
    }
    catch (err) {
        next(err);
    }
};

// get all announcements
exports.getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find()
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: announcements
    });
  } catch (err) {
    next(err);
  }
};

// get announcement by id
exports.getAnnouncementById = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('createdBy', 'name role');
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

    res.json({ success: true, data: announcement });
  } catch (err) {
    next(err);
  }
};

// update announcement
exports.updateAnnouncement = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { title, content },
      { new: true, runValidators: true }
    );
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

    res.json({ success: true, message: 'Announcement updated', data: announcement });
  } catch (err) {
    next(err);
  }
};

// delete announcement
exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    next(err);
  }
};