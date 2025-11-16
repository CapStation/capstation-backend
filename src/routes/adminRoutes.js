const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

router.get('/pending-roles', authMiddleware, requireRole('admin'), async (req, res, next) => {
  const users = await User.find({ pendingRole: { $ne: null } }).select('-passwordHash');
  res.json(users);
});

router.put('/pending-roles/:id/approve', authMiddleware, requireRole('admin'), async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Not found' });
  user.role = user.pendingRole;
  user.pendingRole = null;
  user.roleApproved = true;
  await user.save();
  res.json({ message: 'approved', user: { id: user._id, role: user.role } });
});

module.exports = router;
