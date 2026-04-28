/**
 * Global error handler — Supabase / Express / JWT errors only.
 * All Mongoose-specific handlers have been removed.
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired', expired: true });
  }

  // Supabase unique-constraint violation (PostgreSQL code 23505)
  if (err.code === '23505') {
    return res.status(400).json({ message: 'A record with that value already exists' });
  }

  // Supabase foreign-key violation (PostgreSQL code 23503)
  if (err.code === '23503') {
    return res.status(400).json({ message: 'Referenced record does not exist' });
  }

  // Supabase not-null violation (PostgreSQL code 23502)
  if (err.code === '23502') {
    return res.status(400).json({ message: `Missing required field: ${err.column}` });
  }

  // Default
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
