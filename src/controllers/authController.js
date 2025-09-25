const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/userModel');
const mailer = require('../services/mailService');
const { generateToken } = require('../middlewares/authMiddleware');
const VERIFY_HOURS = Number(process.env.VERIFY_TOKEN_HOURS || 24);
const RESET_MINUTES = Number(process.env.RESET_TOKEN_MINUTES || 60);

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, username } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'name,email,password required' });
    
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenExpires = new Date(Date.now() + VERIFY_HOURS * 3600 * 1000);
    
    const user = new User({
      name, email, passwordHash, role: role || 'mahasiswa',
      verifyToken, verifyTokenExpires
    });
    await user.save();

    const verifyUrl = `${process.env.APP_BASE_URL || 'http://localhost:5000'}/api/auth/verify?token=${verifyToken}&email=${encodeURIComponent(email)}`;
    await mailer.sendVerificationEmail(email, name, verifyUrl).catch(e => console.warn('Email error', e));

    return res.status(201).json({ message: 'Registered. Check email to verify.' });
  } catch (err) { next(err); }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) return res.status(400).json({ message: 'token & email required' });
    const user = await User.findOne({ email });
    if (!user || user.verifyToken !== token) return res.status(400).json({ message: 'Invalid token' });
    if (user.verifyTokenExpires && new Date() > user.verifyTokenExpires) return res.status(400).json({ message: 'Token expired' });

    user.isVerified = true;
    user.verifyToken = null;
    user.verifyTokenExpires = null;
    await user.save();
    return res.json({ message: 'Email verified' });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email & password required' });
    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) return res.status(401).json({ message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.isVerified) return res.status(403).json({ message: 'Email not verified' });

    const token = generateToken(user);
    return res.json({ accessToken: token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) { next(err); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'email required' });
    const user = await User.findOne({ email });
    if (!user) return res.json({ message: 'If account exists, a reset email has been sent.' }); // don't reveal existence
    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpires = new Date(Date.now() + RESET_MINUTES * 60 * 1000);
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || process.env.APP_BASE_URL || 'http://localhost:5000'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    await mailer.sendResetPasswordEmail(email, user.name, resetUrl).catch(e => console.warn('Email error', e));
    return res.json({ message: 'If account exists, a reset email has been sent.' });
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, email, newPassword } = req.body;
    if (!token || !email || !newPassword) return res.status(400).json({ message: 'token,email,newPassword required' });
    const user = await User.findOne({ email });
    if (!user || !user.resetToken || user.resetToken !== token) return res.status(400).json({ message: 'Invalid token' });
    if (user.resetTokenExpires && new Date() > user.resetTokenExpires) return res.status(400).json({ message: 'Token expired' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();
    return res.json({ message: 'Password has been reset' });
  } catch (err) { next(err); }
};
