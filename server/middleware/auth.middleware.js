const jwt = require('jsonwebtoken');
const { supabase } = require('../config/db');

/**
 * Protect — verifies JWT and attaches req.user (from Supabase users table).
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user row from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, shop_name, phone_number, role, email_verified, notif_email, notif_sms, low_stock_threshold, created_at')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Normalise to camelCase so controllers stay consistent
    req.user = {
      _id: user.id,          // keep _id alias for backward compat
      id:  user.id,
      email: user.email,
      shopName: user.shop_name,
      phoneNumber: user.phone_number,
      role: user.role,
      emailVerified: user.email_verified,
      preferences: {
        notifications: {
          email: user.notif_email,
          sms:   user.notif_sms,
        },
        lowStockThreshold: user.low_stock_threshold,
      },
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', expired: true });
    }
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

/**
 * requireRole(...roles) — RBAC middleware factory.
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access denied. Required role(s): ${roles.join(', ')}`,
    });
  }
  next();
};

module.exports = { protect, requireRole };
