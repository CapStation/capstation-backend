const Project = require('../models/Project');
const Group = require('../models/groupModel');
const Announcement = require('../models/announcementModel');

exports.getDashboard = async (req, res, next) => {
  try {
    const capstoneFilter = {};
    const totalProjects = await Project.countDocuments(capstoneFilter);
    const waitingApproval = await Project.countDocuments({ ...capstoneFilter, capstoneStatus: 'pending' });
    const ongoingProjects = await Project.countDocuments({ ...capstoneFilter, capstoneStatus: 'accepted' });
    const closedProjects = await Project.countDocuments({ ...capstoneFilter, capstoneStatus: 'rejected' });

    const perCategory = await Project.aggregate([
      { $match: capstoneFilter },
      { $group: { _id: '$tema', count: { $sum: 1 } } }
    ]);

    const perStatus = await Project.aggregate([
      { $match: capstoneFilter },
      { $group: { _id: '$capstoneStatus', count: { $sum: 1 } } }
    ]);

    const groupsPerCategory = await Group.aggregate([
      { $lookup: {
          from: 'projects',
          localField: 'capstone',
          foreignField: '_id',
          as: 'capstoneData'
        }
      },
      { $unwind: '$capstoneData' },
      { $group: { _id: '$capstoneData.tema', count: { $sum: 1 } } }
    ]);

    const latest = await Project.find(capstoneFilter).sort({ createdAt: -1 }).limit(5);
    const announcements = await Announcement.find()
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalProjects,
      waitingApproval,
      ongoingProjects,
      closedProjects,
      perCategory,
      perStatus,
      groupsPerCategory,
      latest,
      announcements
    });
  } catch (err) {
    next(err);
  }
};
