// ─── KMRL DocuSense — Express Server ────────────────────────
'use strict';

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const connectDB   = require('./config/db');
const seedUsers   = require('./seeds/seedUsers');
const authRoutes  = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const userRoutes = require('./routes/userRoutes');
const aiRoutes = require('./routes/aiRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { startGmailService } = require('./services/gmailService');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Database & Setup ────────────────────────────────────────
connectDB().then(async () => {
  try {
    await seedUsers();
  } catch (error) {
    console.error('[Startup] Failed to seed default users:', error.message);
  }
});

// ─── Core Middleware ─────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ─── Routes ──────────────────────────────────────────────────
// Health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'KMRL DocuSense API Running',
  });
});

// Auth
app.use('/api/auth', authRoutes);

// Documents
app.use('/api/documents', documentRoutes);

// Dashboard
app.use('/api/dashboard', dashboardRoutes);

// Analytics
app.use('/api/analytics', analyticsRoutes);

// Tickets
app.use('/api/tickets', ticketRoutes);

// Users
app.use('/api/users', userRoutes);

// AI
app.use('/api/ai', aiRoutes);

// Notifications
app.use('/api/notifications', notificationRoutes);

// ─── Global Error Handler ────────────────────────────────────
// Catches errors thrown/rejected inside async route handlers
app.use((err, _req, res, _next) => {
  console.error(`[ERROR] ${err.message}`);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// 404 — catch-all for unregistered routes
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('┌─────────────────────────────────────────┐');
  console.log('│        KMRL DocuSense API Server         │');
  console.log('├─────────────────────────────────────────┤');
  console.log(`│  🚀  Listening on   http://localhost:${PORT}  │`);
  console.log(`│  🌍  Environment    ${(process.env.NODE_ENV || 'development').padEnd(21)}│`);
  console.log('└─────────────────────────────────────────┘');
  console.log('');
  startGmailService().catch((error) => console.error('[Gmail API] startup error:', error.message));
});
