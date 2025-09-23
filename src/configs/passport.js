const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');

module.exports = function setupPassport() {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: false
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] && profile.emails[0].value;
      if (!email) return done(new Error('No email'), null);
      let user = await User.findOne({ email });
      if (!user) {
        user = new User({
          name: profile.displayName || 'Google User',
          email,
          isVerified: true,
          oauthProvider: 'google'
        });
        await user.save();
      } else {
        if (!user.oauthProvider) {
          user.oauthProvider = 'google';
          await user.save();
        }
      }
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }));

  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser(async (id, done) => {
    const u = await User.findById(id);
    done(null, u);
  });
};
