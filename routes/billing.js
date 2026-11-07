import { Router } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import {
  getOrCreateQuota,
  quotaPayload,
  activateSubscription,
} from '../services/billingService.js';
import { PLAN_PRICE_INR, PLAN_NAME, isFreemiumEnabled } from '../constants/billing.js';

const router = Router();

function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
}

router.get('/quota/:guestId', async (req, res) => {
  try {
    const quota = await getOrCreateQuota(req.params.guestId);
    res.json(quotaPayload(quota));
  } catch (err) {
    res.status(400).json({ error: err.message || 'Invalid guest id' });
  }
});

router.post('/create-order', async (req, res) => {
  try {
    if (!isFreemiumEnabled()) {
      return res.status(503).json({
        error: 'Payments are temporarily disabled',
        freemiumEnabled: false,
      });
    }

    const { guestId } = req.body || {};
    if (!guestId) return res.status(400).json({ error: 'guestId is required' });

    await getOrCreateQuota(guestId);

    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.json({
        configured: false,
        mock: true,
        amount: PLAN_PRICE_INR * 100,
        currency: 'INR',
        planName: PLAN_NAME,
        planPriceInr: PLAN_PRICE_INR,
        keyId: null,
        orderId: `mock_order_${guestId.slice(0, 8)}`,
        message: 'Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable real payments.',
      });
    }

    const order = await razorpay.orders.create({
      amount: PLAN_PRICE_INR * 100,
      currency: 'INR',
      receipt: `astro_${guestId.slice(0, 20)}_${Date.now()}`.slice(0, 40),
      notes: { guestId, plan: 'premium_monthly' },
    });

    res.json({
      configured: true,
      mock: false,
      amount: order.amount,
      currency: order.currency,
      planName: PLAN_NAME,
      planPriceInr: PLAN_PRICE_INR,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    if (!isFreemiumEnabled()) {
      return res.status(503).json({
        error: 'Payments are temporarily disabled',
        freemiumEnabled: false,
      });
    }

    const {
      guestId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      mock,
    } = req.body || {};

    if (!guestId) return res.status(400).json({ error: 'guestId is required' });

    const razorpay = getRazorpay();

    if (mock || !razorpay) {
      if (razorpay && mock) {
        return res.status(400).json({ error: 'Mock payments disabled when Razorpay is configured' });
      }
      const quota = await activateSubscription(guestId, `mock_${Date.now()}`);
      return res.json({ success: true, mock: true, quota });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const quota = await activateSubscription(guestId, razorpay_payment_id);
    res.json({ success: true, mock: false, quota });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

export default router;
