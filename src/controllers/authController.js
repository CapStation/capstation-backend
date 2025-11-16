const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, passwordHash, role });
    await user.save();

    res.status(201).json({ message: 'User registered', user: { id: user._id, email: user.email } });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = { sub: user._id, role: user.role, email: user.email };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({ accessToken: token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) {
    next(err);
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({ message: 'Token atau email tidak ada' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.userId, email });

    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    if (user.isVerified) {
      return res.send('Email kamu sudah terverifikasi!');
    }

    user.isVerified = true;
    await user.save();

    return res.send('Email berhasil diverifikasi. Sekarang kamu bisa login!');
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: 'Token tidak valid atau sudah kadaluarsa' });
  }
};
