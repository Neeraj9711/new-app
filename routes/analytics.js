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
    const clientCity = String(req.body?.city || '').trim().slice(0, 80) || null;
    const clientState = String(req.body?.state || '').trim().slice(0, 80) || null;
    const clientCountry = String(req.body?.country || '').trim().slice(0, 80) || null;

    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId is required' });
    }

    if (path.startsWith('/admin')) {
      return res.json({ ok: true, skipped: true });
    }

    if (shouldSkipDuplicate(visitorId, path) && !hasGps && !clientCity) {
      return res.json({ ok: true, deduped: true });
    }

    const ipGeo = await resolveRequestGeo(req);
    const vpnLike = Boolean(ipGeo.isProxy || ipGeo.isHosting);

    // VPN exit location (for reference only — not the visitor's real city)
    const vpnExitCity = vpnLike ? (ipGeo.city || null) : null;
    const vpnExitState = vpnLike ? (ipGeo.state || null) : null;

    let city = null;
    let state = null;
    let country = ipGeo.country || null;
    let countryCode = ipGeo.countryCode || null;
    let geoSource = 'unknown';

    // 1) Prefer client-resolved GPS city (most accurate)
    if (clientCity || clientState) {
      city = clientCity;
      state = clientState;
      country = clientCountry || country;
      geoSource = 'gps';
    } else if (hasGps) {
      // 2) Server reverse-geocode of GPS coordinates
      const gps = await reverseGeocode(latitude, longitude);
      if (gps?.city || gps?.state) {
        city = gps.city || null;
        state = gps.state || null;
        country = gps.country || country;
        countryCode = gps.countryCode || countryCode;
        geoSource = 'gps';
      }
    } else if (!vpnLike) {
      // 3) Only trust IP city when NOT a VPN/proxy/hosting exit
      city = ipGeo.city || null;
      state = ipGeo.state || null;
      country = ipGeo.country || country;
      countryCode = ipGeo.countryCode || countryCode;
      geoSource = city || state ? 'ip' : 'unknown';
    }
    // else: VPN without GPS → leave city/state unknown (don't show Mumbai as visitor city)

    const visit = await Visit.create({
      visitorId,
      path,
      ip: ipGeo.ip || getClientIp(req),
      city,
      state,
      country,
      countryCode,
      vpnExitCity,
      vpnExitState,
      isp: ipGeo.isp,
      org: ipGeo.org,
      isProxy: vpnLike,
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
      vpnExitCity: visit.vpnExitCity,
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
