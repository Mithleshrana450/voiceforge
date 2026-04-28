// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const voiceRoutes = require('./routes/voice');
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
const usageRoutes = require('./routes/usage');

const app = express();

// ── Port — Render uses process.env.PORT automatically ─────
// DO NOT hardcode 3001 — let Render assign the port
const PORT = process.env.PORT || 3001;

// ── Ensure storage directories exist ──────────────────────
[process.env.UPLOAD_DIR || './uploads', process.env.GENERATED_DIR || './generated']
  .forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ── Security ───────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ── CORS ───────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://voiceforge-sigma.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Rate limiting ──────────────────────────────────────────
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many auth requests' } }));
app.use('/api/generate-voice', rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Too many generations per minute' } }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: 'Too many requests' } }));

app.use(express.json({ limit: '10mb' }));

// ── Static files (locally generated audio — fallback only) ─
app.use('/generated', express.static(path.join(__dirname, 'generated')));

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api', voiceRoutes);

// ── Health check ───────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  port: PORT,
  elevenlabs: !!process.env.ELEVENLABS_API_KEY,
  razorpay: !!process.env.RAZORPAY_KEY_ID,
  jwt: !!process.env.JWT_SECRET,
  firebase: !!process.env.FIREBASE_SERVICE_ACCOUNT,
}));

// Root route — so Render doesn't 404 on /
app.get('/', (req, res) => res.json({
  name: 'VoiceForge API',
  status: 'running',
  version: '1.0.0',
}));

// ── Global error handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Start server ───────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎙️  VoiceForge API running on port ${PORT}`);
  console.log(`   ElevenLabs  : ${process.env.ELEVENLABS_API_KEY ? '✅ set' : '❌ missing'}`);
  console.log(`   JWT Secret  : ${process.env.JWT_SECRET ? '✅ set' : '⚠️  using default'}`);
  console.log(`   Razorpay    : ${process.env.RAZORPAY_KEY_ID ? '✅ set' : '❌ missing'}`);
  console.log(`   Firebase    : ${process.env.FIREBASE_SERVICE_ACCOUNT ? '✅ set' : '⚠️  not set (memory mode)'}`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`   Limit check : ${require('./db').getPlanLimits('free').voices}\n`);
});
