const User = require('../models/userModel');

/**
 * Search user by email
 */
exports.searchUserByEmail = async (req, res, next) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email parameter diperlukan'
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log('🔍 [searchUserByEmail] Searching for user');
    console.log('   Email from query:', email);
    console.log('   Normalized email:', normalizedEmail);
    console.log('   Request user (auth):', req.user?._id ? `✅ ${req.user._id}` : '❌ No auth');
    
    const user = await User.findOne({ email: normalizedEmail }).select('_id name email');

    if (!user) {
      console.log('❌ User not found');
      console.log('   Total users in DB:', await User.countDocuments());
      
      // List sample emails for debugging
      const allUsers = await User.find({}).select('email').limit(5);
      console.log('   Sample emails in DB:', allUsers.map(u => u.email));
      
      return res.status(200).json({
        success: false,
        message: 'User tidak ditemukan',
        debug: {
          searchedEmail: normalizedEmail,
          totalUsersInDB: await User.countDocuments()
        }
      });
    }

    console.log('✅ User found');
    console.log('   User ID:', user._id);
    console.log('   User email:', user.email);
    
    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('❌ Error in searchUserByEmail:', err.message);
    next(err);
  }
};

/**
 * Get current user
 */
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DEBUG: List all users (Development only)
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('_id name email');
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (err) {
    next(err);
  }
};
