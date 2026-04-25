const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/usage ───────────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const usage = db.getUsage(req.user.id);
  const limits = db.getPlanLimits(req.user.plan);
  res.json({
    generations: usage.generations,
    maxGenerations: limits.generations,
    voices: limits.voices,
    month: usage.month,
    plan: req.user.plan,
  });
});

module.exports = router;