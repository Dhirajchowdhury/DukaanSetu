const express = require('express');
const passport = require('passport');
const {
  signup,
  verifyEmail,
  login,
  refresh,
  logout,
  getMe,
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

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    // Generate tokens
    const accessToken = generateAccessToken(req.user._id);
    const refreshToken = generateRefreshToken(req.user._id);

    // Set refresh token in cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Redirect to frontend with access token
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${accessToken}`);
  }
);

module.exports = router;
