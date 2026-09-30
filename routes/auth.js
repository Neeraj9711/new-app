import { Router } from 'express';
import {
  verifyGoogleIdToken,
  upsertGoogleUser,
  signToken,
  toPublicUser,
} from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';
import { getClientIp, logActivity } from '../services/activityService.js';

const router = Router();

const TRACK_TYPES = new Set(['page', 'kundli', 'chat_start', 'chat_message']);

function normalizePhone(phone) {
  const cleaned = String(phone || '').replace(/[\s\-()]/g, '');
  if (!/^\+?[0-9]{10,15}$/.test(cleaned)) return null;
  return cleaned;
}

function normalizeCity(city) {
  const value = String(city || '').trim().replace(/\s+/g, ' ');
  if (value.length < 2 || value.length > 80) return null;
  return value;
}

router.get('/config', (_req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID_WEB || '',
  });
});

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

    const { user, isNew } = await upsertGoogleUser(googleProfile, language);
    user.lastLoginAt = new Date();
    user.lastLoginIp = getClientIp(req);
    user.loginCount = (user.loginCount || 0) + 1;
    if (language === 'en' || language === 'hi') user.language = language;
    await user.save();

    await logActivity(req, {
      user,
      type: 'login',
      path: '/login',
      meta: {
        isNew,
        loginCount: user.loginCount,
        email: user.email,
        name: user.name,
      },
    });

    const token = signToken(user);
    res.json({
      token,
      isNew,
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

router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { phone, city } = req.body || {};
    if (phone !== undefined) {
      const normalized = normalizePhone(phone);
      if (!normalized) {
        return res.status(400).json({ error: 'Valid phone number is required (10–15 digits)' });
      }
      req.user.phone = normalized;
      req.user.phoneVerified = false;
    }
    if (city !== undefined) {
      const normalized = normalizeCity(city);
      if (!normalized) {
        return res.status(400).json({ error: 'City is required (2–80 characters)' });
      }
      req.user.city = normalized;
    }
    await req.user.save();

    await logActivity(req, {
      user: req.user,
      type: 'profile_update',
      path: '/profile',
      meta: {
        phone: req.user.phone,
        city: req.user.city,
      },
    });

    res.json({ user: toPublicUser(req.user) });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

router.post('/event', requireAuth, async (req, res) => {
  try {
    const type = String(req.body?.type || '');
    if (!TRACK_TYPES.has(type)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }
    const path = String(req.body?.path || '').slice(0, 200);
    const meta = req.body?.meta && typeof req.body.meta === 'object' ? req.body.meta : {};
    await logActivity(req, { user: req.user, type, path, meta });
    res.json({ success: true });
  } catch (err) {
    console.error('Event log error:', err);
    res.status(500).json({ error: 'Failed to log event' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

router.post('/logout', requireAuth, async (req, res) => {
  await logActivity(req, {
    user: req.user,
    type: 'logout',
    path: '/logout',
  });
  res.json({ success: true });
});

export default router;
