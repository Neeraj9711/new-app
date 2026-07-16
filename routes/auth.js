import { Router } from 'express';
import {
  verifyGoogleIdToken,
  upsertGoogleUser,
  signToken,
  toPublicUser,
} from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function normalizePhone(phone) {
  const cleaned = String(phone || '').replace(/[\s\-()]/g, '');
  if (!/^\+?[0-9]{10,15}$/.test(cleaned)) return null;
  return cleaned;
}

router.post('/google', async (req, res) => {
  try {
    const { idToken, language } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' });
    }

    const googleProfile = await verifyGoogleIdToken(idToken);
    if (!googleProfile.emailVerified) {
      return res.status(403).json({ error: 'Google email is not verified' });
    }

    const user = await upsertGoogleUser(googleProfile, language);
    const token = signToken(user);

    res.json({
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Google authentication failed', details: err.message });
  }
});

router.post('/phone', requireAuth, async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    if (!phone) {
      return res.status(400).json({ error: 'Valid phone number is required (10–15 digits)' });
    }

    req.user.phone = phone;
    req.user.phoneVerified = false;
    await req.user.save();

    res.json({ user: toPublicUser(req.user) });
  } catch (err) {
    console.error('Phone update error:', err);
    res.status(500).json({ error: 'Failed to save phone number' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

router.post('/logout', requireAuth, async (_req, res) => {
  res.json({ success: true });
});

export default router;
