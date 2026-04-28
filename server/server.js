require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');

const { connectDB }      = require('./config/db');
const passport           = require('./config/passport');
const errorHandler       = require('./middleware/errorHandler');
const alertScheduler     = require('./cron/alertScheduler');

const authRoutes         = require('./routes/auth.routes');
const productRoutes      = require('./routes/product.routes');
const categoryRoutes     = require('./routes/category.routes');
const barcodeRoutes      = require('./routes/barcode.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

// ── Connect to Supabase (PostgreSQL) ─────────────────────────────────────────
connectDB();

// ── Security & parsing middleware ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max:      100,
  message:  'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// ── Passport (Google OAuth) ───────────────────────────────────────────────────
app.use(passport.initialize());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/products',      productRoutes);
app.use('/api/categories',    categoryRoutes);
app.use('/api/barcode',       barcodeRoutes);
app.use('/api/notifications', notificationRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'OK', database: 'Supabase (PostgreSQL)', timestamp: new Date().toISOString() });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Cron jobs ─────────────────────────────────────────────────────────────────
alertScheduler.start();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️  Database: Supabase (PostgreSQL)`);
});
