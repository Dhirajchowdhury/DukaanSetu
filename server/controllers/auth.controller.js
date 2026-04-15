const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/generateToken');
const { sendVerificationEmail } = require('../services/email.service');

// Store OTPs temporarily (in production, use Redis)
const otpStore = new Map();

/**
 * @desc    Register new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
const signup = async (req, res, next) => {
  try {
    const { email, password, shopName, phoneNumber } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      shopName,
      phoneNumber,
    });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 minutes

    // Send verification email
    await sendVerificationEmail(email, otp);

    res.status(201).json({
      message: 'User registered successfully. Please check your email for verification code.',
      userId: user._id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify email with OTP
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const storedOTP = otpStore.get(email);

    if (!storedOTP) {
      return res.status(400).json({ message: 'OTP expired or not found' });
    }

    if (storedOTP.expiresAt < Date.now()) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP expired' });
    }

    if (storedOTP.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Update user
    const user = await User.findOneAndUpdate(
      { email },
      { emailVerified: true },
      { new: true }
    );

    otpStore.delete(email);

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: 'Email verified successfully',
      accessToken,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ message: 'Please verify your email first' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Login successful',
      accessToken,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token' });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Generate new access token
    const accessToken = generateAccessToken(decoded.id);

    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logout successful' });
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = {
  signup,
  verifyEmail,
  login,
  refresh,
  logout,
  getMe,
};
