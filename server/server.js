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
const connectRoutes      = require('./routes/connect.routes');
const ordersRoutes       = require('./routes/orders.routes');
const profileRoutes      = require('./routes/profile.routes');
const chatRoutes         = require('./routes/chat.routes');
const inquiryRoutes      = require('./routes/inquiry.routes');
const connectionRoutes   = require('./routes/connection.routes');
const conversationsRoutes = require('./routes/conversations.routes');
const messagesRoutes     = require('./routes/messages.routes');

const app = express();

// ── Connect to Supabase (PostgreSQL) ─────────────────────────────────────────
connectDB();

// ── Security & parsing middleware ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      "https://dukaansetu.vercel.app",
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
app.use('/api/connect',       connectRoutes);
app.use('/api/orders',        ordersRoutes);
app.use('/api/profile',       profileRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/inquiries',     inquiryRoutes);
app.use('/api/connections',   connectionRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/messages',      messagesRoutes);

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
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error(err);
  }
});
