const Capstone = require('../models/capstoneModel');
const Group = require('../models/groupModel');
const Announcement = require('../models/announcementModel');

exports.getDashboard = async (req, res, next) => {
  try {
    const totalProjects = await Capstone.countDocuments();
    const waitingApproval = await Capstone.countDocuments({ status: 'Menunggu' });
    const ongoingProjects = await Capstone.countDocuments({ status: 'Bisa dilanjutkan' });
    const closedProjects = await Capstone.countDocuments({ status: 'Ditutup' });

    const perCategory = await Capstone.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const perStatus = await Capstone.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const groupsPerCategory = await Group.aggregate([
      { $lookup: {
          from: 'capstones',
          localField: 'capstone',
          foreignField: '_id',
          as: 'capstoneData'
        }
      },
      { $unwind: '$capstoneData' },
      { $group: { _id: '$capstoneData.category', count: { $sum: 1 } } }
    ]);

    const latest = await Capstone.find().sort({ createdAt: -1 }).limit(5);
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
