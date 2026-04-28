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
const PORT = process.env.PORT || 3001;

// Ensure directories exist
const dirs = [
    process.env.UPLOAD_DIR || './uploads',
    process.env.GENERATED_DIR || './generated'
];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use(express.json());

// Static file serving for generated audio
app.use('/generated', express.static(path.join(__dirname, 'generated')));

// Optional basic auth middleware
const basicAuth = (req, res, next) => {
    if (!process.env.AUTH_USERNAME || !process.env.AUTH_PASSWORD) return next();
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Authentication required' });
    const [type, credentials] = authHeader.split(' ');
    if (type !== 'Basic') return res.status(401).json({ error: 'Basic auth required' });
    const [username, password] = Buffer.from(credentials, 'base64').toString().split(':');
    if (username !== process.env.AUTH_USERNAME || password !== process.env.AUTH_PASSWORD) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    next();
};

// Routes
app.use('/api', basicAuth, voiceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/usage', usageRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Error handler
app.use((err, req, res, next) => {
    console.error('[Error]', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🎙️  VoiceClone API running on http://localhost:${PORT}`);
    console.log(`   Limit check:`, require('./db').getPlanLimits('free').voices);
    console.log(`   ElevenLabs key: ${process.env.ELEVENLABS_API_KEY ? '✅ set' : '❌ missing'}`);
});