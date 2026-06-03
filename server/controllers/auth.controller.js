const bcrypt = require('bcryptjs');
const { supabase } = require('../config/db');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/generateToken');
const { sendVerificationEmail } = require('../services/email.service');

// ── helpers ──────────────────────────────────────────────────────────────────

/** Map a DB row → safe public user object */
const toPublicUser = (row) => ({
  id:           row.id,
  email:        row.email,
  shopName:     row.shop_name,
  phoneNumber:  row.phone_number,
  role:         row.role,
  emailVerified: row.email_verified,
  latitude:     row.latitude,
  longitude:    row.longitude,
  address:      row.address,
  city:         row.city,
  state:        row.state,
  isProfileComplete: row.is_profile_complete,
  preferences: {
    notifications: {
      email: row.notif_email,
      sms:   row.notif_sms,
    },
    lowStockThreshold: 10, // Safe default fallback
  },
  createdAt: row.created_at,
});

// ── controllers ───────────────────────────────────────────────────────────────

/**
 * @desc  Register new user
 * @route POST /api/auth/signup
 */
const signup = async (req, res, next) => {
  console.log("Signup payload:", req.body);
  try {
    const email = req.body.email;
    const password = req.body.password;
    const shop_name = req.body.shop_name ?? req.body.shopName;
    const phone_number = req.body.phone_number ?? req.body.phoneNumber;
    const role = req.body.role;

    if (!email || !password || !shop_name || !role) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert([{
        email: email.toLowerCase(),
        password_hash,
        shop_name,
        phone_number,
        role,
        email_verified: true, // Auto-verify for MVP
      }])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      if (error.code === '23505') {
        return res.status(400).json({ message: "Email already exists" });
      }
      return res.status(400).json({ message: error.message });
    }

    const accessToken  = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   isSecure,
      sameSite: isSecure ? 'none' : 'lax',
      path:     '/',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("Signup error FULL:", err);
    next(err);
  }
};

/**
 * @desc  Verify email with OTP
 * @route POST /api/auth/verify-email
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const normalEmail = email.toLowerCase();

    const { data: stored, error: fetchErr } = await supabase
      .from('otp_store')
      .select('otp, expires_at')
      .eq('email', normalEmail)
      .maybeSingle();

    if (fetchErr || !stored) {
      return res.status(400).json({ message: 'OTP expired or not found' });
    }

    if (new Date(stored.expires_at) < new Date()) {
      await supabase.from('otp_store').delete().eq('email', normalEmail);
      return res.status(400).json({ message: 'OTP expired' });
    }

    if (stored.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Mark verified
    const { data: user, error: updateErr } = await supabase
      .from('users')
      .update({ email_verified: true })
      .eq('email', normalEmail)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Clean up OTP
    await supabase.from('otp_store').delete().eq('email', normalEmail);

    const accessToken  = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   isSecure,
      sameSite: isSecure ? 'none' : 'lax',
      path:     '/',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Email verified successfully',
      accessToken,
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Login
 * @route POST /api/auth/login
 */
const login = async (req, res, next) => {
  console.log("Login payload:", req.body);
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      console.error("Supabase error:", error);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ message: 'Please sign in with Google' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken  = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   isSecure,
      sameSite: isSecure ? 'none' : 'lax',
      path:     '/',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Login successful',
      accessToken,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("Login error FULL:", err);
    next(err);
  }
};

/**
 * @desc  Refresh access token
 * @route POST /api/auth/refresh
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token' });
    }

    const decoded = verifyRefreshToken(refreshToken);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const accessToken = generateAccessToken(user.id, user.role);
    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

/**
 * @desc  Logout
 * @route POST /api/auth/logout
 */
const logout = (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logout successful' });
};

/**
 * @desc  Get current user
 * @route GET /api/auth/me
 */
const getMe = (req, res) => {
  res.json({ user: req.user });
};

/**
 * @desc  Update profile
 * @route PUT /api/auth/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { shopName, phoneNumber, preferences } = req.body;
    const updates = {};

    if (shopName)    updates.shop_name    = shopName;
    if (phoneNumber) updates.phone_number = phoneNumber;

    if (preferences) {
      if (preferences.notifications?.email !== undefined)
        updates.notif_email = preferences.notifications.email;
      if (preferences.notifications?.sms !== undefined)
        updates.notif_sms = preferences.notifications.sms;
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Profile updated', user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Change password
 * @route PUT /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const password_hash = await bcrypt.hash(newPassword, 12);

    await supabase
      .from('users')
      .update({ password_hash })
      .eq('id', req.user.id);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  verifyEmail,
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
  changePassword,
};
