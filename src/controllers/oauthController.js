const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { generateToken } = require('../middlewares/authMiddleware');

exports.completeOauthProfile = async (req, res, next) => {
  try {
    const bearer = (req.headers.authorization && req.headers.authorization.split(' ')[1]) || req.body.token;
    if (!bearer) return res.status(400).json({ message: 'Missing setup token' });
    const payload = jwt.verify(bearer, process.env.JWT_SECRET);
    if (payload.purpose !== 'oauth-setup') return res.status(401).json({ message: 'Invalid setup token' });

    const user = await User.findById(payload.sub);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { role } = req.body;
    if (!role) return res.status(400).json({ message: 'role required' });

    // Security: only allow safe auto-assign
    const allowedDomains = (process.env.ALLOWED_DOSHEN_DOMAINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const emailDomain = user.email.split('@')[1] || '';

    if (role === 'admin') {
      user.pendingRole = 'admin';
      user.roleApproved = false;
      await user.save();
      return res.json({ message: 'Admin requested — pending approval' });
    }

    if (role === 'dosen') {
      if (allowedDomains.includes(emailDomain)) {
        user.role = 'dosen';
        user.roleApproved = true;
      } else {
        user.pendingRole = 'dosen';
        user.roleApproved = false;
        await user.save();
        return res.json({ message: 'Dosen requested — pending admin approval' });
      }
    }

    if (role === 'mahasiswa') {
      user.role = 'mahasiswa';
      user.roleApproved = true;
    }

    user.pendingRole = null;
    user.isVerified = true;
    await user.save();

    const accessToken = generateToken(user);
    return res.json({ accessToken, user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) {
    return next(err);
  }
};
