const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

// 🔑 Generate token normal
exports.generateToken = (user) => {
  const payload = { sub: user._id.toString(), role: user.role, email: user.email };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// 🔑 Generate token khusus (contoh: setup akun OAuth)
exports.generateSetupToken = (user, opts = {}) => {
  const payload = { sub: user._id.toString(), purpose: 'oauth-setup', ...opts };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: opts.expiresIn || '10m' });
};

// 🔒 Middleware otentikasi
exports.authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub).select(
      '-passwordHash -resetToken -resetTokenExpires -verifyToken -verifyTokenExpires'
    );
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// 🔒 Middleware untuk role-based access control (RBAC)
exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  next();
};
