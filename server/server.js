require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { connectDB } = require('./config/db');
const passport = require('./config/passport');
const errorHandler = require('./middleware/errorHandler');
const alertScheduler = require('./cron/alertScheduler');
const { setupSocket } = require('./services/socket');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const barcodeRoutes = require('./routes/barcode.routes');
const notificationRoutes = require('./routes/notification.routes');
const connectRoutes = require('./routes/connect.routes');
const ordersRoutes = require('./routes/orders.routes');
const profileRoutes = require('./routes/profile.routes');
const chatRoutes = require('./routes/chat.routes');
const inquiryRoutes = require('./routes/inquiry.routes');
const connectionRoutes = require('./routes/connection.routes');
const conversationsRoutes = require('./routes/conversations.routes');
const messagesRoutes = require('./routes/messages.routes');
const analyticsRoutes = require('./routes/analytics.routes');

const app = express();

// ── Connect to Supabase (PostgreSQL) ─────────────────────────────────────────
connectDB();

// ── Security & parsing middleware ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://dukaansetu.vercel.app"
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Rate limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many auth attempts, please try again later.',
});
app.use('/api/auth', authLimiter);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => req.originalUrl.startsWith('/api/auth/'),
});
app.use('/api/', apiLimiter);

// ── Passport (Google OAuth) ───────────────────────────────────────────────────
app.use(passport.initialize());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/barcode', barcodeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/connect', connectRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/analytics', analyticsRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'OK', database: 'Supabase (PostgreSQL)', timestamp: new Date().toISOString() });
});

// ── Debug: check env vars are loaded ──────────────────────────────────────────
app.get('/debug', (req, res) => {
  res.json({
    env: {
      supabaseUrl: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      nodeEnv: process.env.NODE_ENV,
    },
  });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Cron jobs ─────────────────────────────────────────────────────────────────
alertScheduler.start();

const server = http.createServer(app);
setupSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️  Database: Supabase (PostgreSQL)`);
  console.log(`🔌 WebSocket (Socket.IO) enabled`);
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error(err);
  }
});
