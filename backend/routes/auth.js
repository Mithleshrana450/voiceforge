const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Password reset tokens (in-memory; use Redis/DB in production)
const resetTokens = new Map();

// ── POST /api/auth/signup ────────────────────────────────────
router.post('/signup', async (req, res, next) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Invalid email address' });

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = db.createUser({ name, email: email.toLowerCase(), passwordHash });
    const token = generateToken(user.id);
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, plan: user.plan, createdAt: user.createdAt },
    });
  } catch (err) {
    if (err.message === 'Email already registered') return res.status(409).json({ error: err.message });
    next(err);
  }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.findByEmail(email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
  if (!user.passwordHash) return res.status(401).json({ error: 'This account uses Google sign-in' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const token = generateToken(user.id);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, plan: user.plan, createdAt: user.createdAt },
  });
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const { id, name, email, plan, createdAt } = req.user;
  res.json({ user: { id, name, email, plan, createdAt } });
});

// ── POST /api/auth/forgot-password ───────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const user = db.findByEmail(email.toLowerCase());
  // Always respond OK to prevent email enumeration
  if (!user) return res.json({ success: true });

  const token = uuidv4();
  resetTokens.set(token, { userId: user.id, expires: Date.now() + 3600000 }); // 1h

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  // Send email if SMTP configured
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: `"VoiceForge" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: 'Reset your VoiceForge password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <h2 style="margin-bottom:16px">Reset your password</h2>
            <p style="color:#666;margin-bottom:24px">Click the button below to reset your password. This link expires in 1 hour.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#c9a96e;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
            <p style="color:#999;font-size:12px;margin-top:24px">If you didn't request this, ignore this email.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error('Email send failed:', err.message);
    }
  } else {
    // Dev mode: log reset URL
    console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
  }

  res.json({ success: true });
});

// ── POST /api/auth/reset-password ────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

  const data = resetTokens.get(token);
  if (!data || data.expires < Date.now()) return res.status(400).json({ error: 'Reset link expired or invalid' });

  const passwordHash = await bcrypt.hash(password, 12);
  db.updateUser(data.userId, { passwordHash });
  resetTokens.delete(token);

  res.json({ success: true, message: 'Password reset successfully' });
});

// ── GET /api/auth/google ─────────────────────────────────────
// Simple Google OAuth redirect (requires passport-google-oauth20 for full implementation)
// For now: returns instructions if Google keys not configured
router.get('/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=google_not_configured`);
  }
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// ── GET /api/auth/google/callback ────────────────────────────
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${process.env.FRONTEND_URL}?error=google_failed`);

  try {
    const axios = require('axios');
    // Exchange code for tokens
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
      grant_type: 'authorization_code',
    });

    // Get user info
    const userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
    });

    const { id: googleId, email, name } = userInfo.data;

    // Find or create user
    let user = db.findByGoogleId(googleId) || db.findByEmail(email);
    if (!user) {
      user = db.createUser({ name, email: email.toLowerCase(), googleId });
    } else if (!user.googleId) {
      user = db.updateUser(user.id, { googleId });
    }

    const token = generateToken(user.id);
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}?token=${token}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&plan=${user.plan}`);
  } catch (err) {
    console.error('Google OAuth error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL}?error=google_failed`);
  }
});

module.exports = router;