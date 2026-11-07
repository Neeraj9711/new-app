import { Router } from 'express';
import Visit from '../models/Visit.js';
import { getClientIp } from '../services/activityService.js';
import { resolveRequestGeo } from '../services/geoService.js';

const router = Router();

router.post('/visit', async (req, res) => {
  try {
    const visitorId = String(req.body?.visitorId || '').trim().slice(0, 80);
    const path = String(req.body?.path || '/').trim().slice(0, 200) || '/';
    const referrer = String(req.body?.referrer || '').trim().slice(0, 300);

    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId is required' });
    }

    // Skip noisy admin self-tracking
    if (path.startsWith('/admin')) {
      return res.json({ ok: true, skipped: true });
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
    });

    res.json({
      ok: true,
      id: visit._id.toString(),
      city: visit.city,
      state: visit.state,
      country: visit.country,
    });
  } catch (err) {
    console.error('Visit track error:', err);
    res.status(500).json({ error: 'Failed to record visit' });
  }
});

export default router;
