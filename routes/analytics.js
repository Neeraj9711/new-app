import { Router } from 'express';
import Visit from '../models/Visit.js';
import { getClientIp } from '../services/activityService.js';
import { resolveRequestGeo } from '../services/geoService.js';

const router = Router();

// Deduplicate rapid refreshes for same visitor+path within a short window
const recentKeys = new Map();
const DEDUPE_MS = 20_000;

function shouldSkipDuplicate(visitorId, path) {
  const key = `${visitorId}|${path}`;
  const now = Date.now();
  const prev = recentKeys.get(key);
  recentKeys.set(key, now);
  if (recentKeys.size > 5000) {
    for (const [k, at] of recentKeys) {
      if (now - at > DEDUPE_MS) recentKeys.delete(k);
    }
  }
  return Boolean(prev && now - prev < DEDUPE_MS);
}

router.post('/visit', async (req, res) => {
  try {
    const visitorId = String(req.body?.visitorId || '').trim().slice(0, 80);
    const path = String(req.body?.path || '/').trim().slice(0, 200) || '/';
    const referrer = String(req.body?.referrer || '').trim().slice(0, 300);
    const language = String(req.body?.language || '').trim().slice(0, 32) || null;
    const timezone = String(req.body?.timezone || '').trim().slice(0, 64) || null;
    const screen = String(req.body?.screen || '').trim().slice(0, 32) || null;

    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId is required' });
    }

    if (path.startsWith('/admin')) {
      return res.json({ ok: true, skipped: true });
    }

    if (shouldSkipDuplicate(visitorId, path)) {
      return res.json({ ok: true, deduped: true });
    }

    const geo = await resolveRequestGeo(req);
    const visit = await Visit.create({
      visitorId,
      path,
      ip: geo.ip || getClientIp(req),
      city: geo.city,
      state: geo.state,
      country: geo.country,
      countryCode: geo.countryCode,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
      referrer,
      language,
      timezone,
      screen,
    });

    res.json({
      ok: true,
      id: visit._id.toString(),
      city: visit.city,
      state: visit.state,
      country: visit.country,
      ip: visit.ip,
    });
  } catch (err) {
    console.error('Visit track error:', err);
    // Never break the website if tracking fails
    res.status(200).json({ ok: false, error: 'Failed to record visit' });
  }
});

export default router;
