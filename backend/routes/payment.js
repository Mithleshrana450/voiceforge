const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const PLAN_PRICES = {
  pro: 49900,  // ₹499 in paise
  business: 199900, // ₹1999 in paise
};

// Lazy-load Razorpay so server starts even without keys
const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured in .env');
  }
  const Razorpay = require('razorpay');
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// ── POST /api/payment/create-order ──────────────────────────
router.post('/create-order', requireAuth, async (req, res, next) => {
  const { plan } = req.body;

  if (!PLAN_PRICES[plan]) return res.status(400).json({ error: 'Invalid plan. Choose pro or business.' });

  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: PLAN_PRICES[plan],
      currency: 'INR',
      receipt: `vf_${req.user.id}_${Date.now()}`,
      notes: { userId: req.user.id, plan, userEmail: req.user.email },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      plan,
    });
  } catch (err) {
    if (err.message.includes('not configured')) {
      return res.status(503).json({ error: 'Payment system not configured. Add Razorpay keys to .env' });
    }
    next(err);
  }
});

// ── POST /api/payment/verify ─────────────────────────────────
router.post('/verify', requireAuth, (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment details' });
  }
  if (!PLAN_PRICES[plan]) return res.status(400).json({ error: 'Invalid plan' });

  try {
    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed — invalid signature' });
    }

    // Upgrade user plan
    const updated = db.updateUser(req.user.id, { plan });
    console.log(`[Payment] User ${req.user.email} upgraded to ${plan}`);

    res.json({
      success: true,
      plan: updated.plan,
      message: `Successfully upgraded to ${plan} plan`,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/payment/plans ───────────────────────────────────
router.get('/plans', (req, res) => {
  res.json({
    plans: [
      { key: 'free', name: 'Free', price: 0, priceDisplay: '₹0', period: 'forever' },
      { key: 'pro', name: 'Pro', price: 49900, priceDisplay: '₹499', period: '/month' },
      { key: 'business', name: 'Business', price: 199900, priceDisplay: '₹1999', period: '/month' },
    ],
  });
});

module.exports = router;