const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 10;
const Announcement = require('../models/announcementModel');

// create announcement
exports.createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, isImportant } = req.body;
    const announcement = new Announcement({
      title,
      content,
      isImportant: isImportant || false,
      createdBy: req.user._id
    });
    await announcement.save();
    
    // Populate createdBy before returning
    await announcement.populate('createdBy', 'name role');
    
    res.status(201).json({
      success: true,
      data: announcement
    });
  }
  catch (err) {
    next(err);
  }
};

// get all announcements
exports.getAnnouncements = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = DEFAULT_PAGE_LIMIT,
      sort = 'newest',
      search = null
    } = req.query;

    // Determine sort order
    const sortOrder = sort === 'oldest' ? 1 : -1; // -1 for newest (descending), 1 for oldest (ascending)

    // Build search filter
    let filter = {};
    if (search) {
      filter = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = parseInt(limit, 10) || DEFAULT_PAGE_LIMIT;
    const limitNum = Math.min(
      MAX_PAGE_LIMIT,
      Math.max(1, parsedLimit)
    );
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const total = await Announcement.countDocuments(filter);
    const pages = Math.ceil(total / limitNum);

    // Fetch announcements
    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'name role')
      .sort({ createdAt: sortOrder })
      .limit(limitNum)
      .skip(skip);

    res.json({
      success: true,
      data: announcements,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages
      }
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
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    res.json({ success: true, data: announcement });
  } catch (err) {
    next(err);
  }
};

// update announcement
exports.updateAnnouncement = async (req, res, next) => {
  try {
    const { title, content, isImportant } = req.body;
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { title, content, isImportant: isImportant || false },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name role');
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    res.json({
      success: true,
      message: 'Announcement updated',
      data: announcement
    });
  } catch (err) {
    next(err);
  }
};

// delete announcement
exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    next(err);
  }
};
