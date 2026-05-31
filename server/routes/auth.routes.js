const express = require('express');
const passport = require('passport');
const {
  signup,
  verifyEmail,
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
  changePassword,
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const {
  signupValidation,
  loginValidation,
  validate,
} = require('../middleware/validation.middleware');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');

const router = express.Router();

// Local auth routes
router.post('/signup', signupValidation, validate, signup);
router.post('/verify-email', verifyEmail);
router.post('/login', loginValidation, validate, login);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  (req, res, next) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    passport.authenticate('google', { session: false, failureRedirect: `${clientUrl}/login` })(req, res, next);
  },
  (req, res) => {
    // req.user is the raw Supabase row — use .id (not ._id)
    const accessToken  = generateAccessToken(req.user.id, req.user.role);
    const refreshToken = generateRefreshToken(req.user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(
      `${clientUrl}/auth/callback?token=${accessToken}&role=${req.user.role}`
    );
  }
);

module.exports = router;
