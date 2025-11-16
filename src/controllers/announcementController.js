const Announcement = require('../models/announcementModel');

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

exports.getAnnouncements = async (req, res, next) => {
    try {
        const { title, content } = req.body;
        const announcement = new Announcement({
            title,
            content,
            createdBy: req.user._id
        });
        await announcement.save();
        res.status(201).json(announcement);
    } catch (err) {
        next(err);
    }
};
