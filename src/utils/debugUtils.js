const User = require("../models/userModel");

/**
 * Debug utility untuk troubleshooting user registration
 */
exports.debugUserRegistration = async (email) => {
  try {
    console.log(`🔍 Debugging registration for email: ${email}`);

    // Check if user exists
    const existingUser = await User.findOne({ email });
    console.log(`📊 User exists in database:`, existingUser ? "YES" : "NO");

    if (existingUser) {
      console.log(`👤 User details:`, {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        isVerified: existingUser.isVerified,
        role: existingUser.role,
        createdAt: existingUser.createdAt,
      });
    }

    // Check collection indexes
    const indexes = await User.collection.indexes();
    console.log(`📋 Collection indexes:`, indexes);

    return {
      userExists: !!existingUser,
      userDetails: existingUser,
      indexes: indexes,
    };
  } catch (error) {
    console.error(`❌ Debug error:`, error);
    return { error: error.message };
  }
};

/**
 * Clean user data completely (for testing purposes)
 */
exports.cleanUserData = async (email) => {
  try {
    console.log(`🧹 Cleaning user data for: ${email}`);

    const result = await User.deleteOne({ email });
    console.log(`🗑️ Delete result:`, result);

    return result;
  } catch (error) {
    console.error(`❌ Clean error:`, error);
    return { error: error.message };
  }
};
