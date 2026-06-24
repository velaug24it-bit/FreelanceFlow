const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = function setupPassport() {
  // Google
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: (process.env.CLIENT_URL || 'http://localhost:3000') + '/api/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] && profile.emails[0].value;
        let user = await User.findOne({ email });
        if (!user) {
          const randomPassword = crypto.randomBytes(16).toString('hex');
          const salt = await bcrypt.genSalt(10);
          const password_hash = await bcrypt.hash(randomPassword, salt);
          user = await User.create({
            email,
            full_name: profile.displayName || 'Social User',
            password_hash,
            is_email_verified: true,
            avatar_url: profile.photos && profile.photos[0] && profile.photos[0].value
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }));
  }

  // GitHub
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: (process.env.CLIENT_URL || 'http://localhost:3000') + '/api/auth/github/callback',
      scope: ['user:email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // GitHub may not always return public email in profile.emails
        const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || profile._json?.email;
        let user = null;
        if (email) user = await User.findOne({ email });
        if (!user) {
          const randomPassword = crypto.randomBytes(16).toString('hex');
          const salt = await bcrypt.genSalt(10);
          const password_hash = await bcrypt.hash(randomPassword, salt);
          user = await User.create({
            email: email || `gh_${profile.id}@no-email.github`,
            full_name: profile.displayName || profile.username || 'GitHub User',
            password_hash,
            is_email_verified: !!email,
            avatar_url: profile.photos && profile.photos[0] && profile.photos[0].value
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }));
  }

  // Minimal serialize/deserialize (we don't use sessions)
  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};
