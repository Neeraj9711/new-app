import { Router } from 'express';
import Visit from '../models/Visit.js';
import { getClientIp } from '../services/activityService.js';
import { resolveRequestGeo, reverseGeocode } from '../services/geoService.js';

const router = Router();

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
    const latitude = Number(req.body?.latitude);
    const longitude = Number(req.body?.longitude);
    const hasGps = Number.isFinite(latitude) && Number.isFinite(longitude);

    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId is required' });
    }

    if (path.startsWith('/admin')) {
      return res.json({ ok: true, skipped: true });
    }

    if (shouldSkipDuplicate(visitorId, path) && !hasGps) {
      return res.json({ ok: true, deduped: true });
    }

    const ipGeo = await resolveRequestGeo(req);
    let city = ipGeo.city;
    let state = ipGeo.state;
    let country = ipGeo.country;
    let countryCode = ipGeo.countryCode;
    let geoSource = 'ip';

    // Prefer browser GPS when available (much more accurate than VPN exit IP)
    if (hasGps) {
      const gps = await reverseGeocode(latitude, longitude);
      if (gps?.city || gps?.state) {
        city = gps.city || city;
        state = gps.state || state;
        country = gps.country || country;
        countryCode = gps.countryCode || countryCode;
        geoSource = 'gps';
      }
    }

    // If IP is VPN/proxy and we only have IP city, mark source clearly
    if (geoSource === 'ip' && (ipGeo.isProxy || ipGeo.isHosting) && !city) {
      geoSource = 'unknown';
    }

    const visit = await Visit.create({
      visitorId,
      path,
      ip: ipGeo.ip || getClientIp(req),
      city,
      state,
      country,
      countryCode,
      isp: ipGeo.isp,
      org: ipGeo.org,
      isProxy: Boolean(ipGeo.isProxy),
      isHosting: Boolean(ipGeo.isHosting),
      geoSource,
      latitude: hasGps ? latitude : null,
      longitude: hasGps ? longitude : null,
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
      isp: visit.isp,
      isProxy: visit.isProxy,
      geoSource: visit.geoSource,
      ip: visit.ip,
    });
  } catch (err) {
    console.error('Visit track error:', err);
    res.status(200).json({ ok: false, error: 'Failed to record visit' });
  }
});

export default router;
