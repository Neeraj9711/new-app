import { Router } from 'express';
import Visit from '../models/Visit.js';
import { getClientIp } from '../services/activityService.js';
import { cleanPlaceName, isValidLatLon, resolveRequestGeo, reverseGeocode } from '../services/geoService.js';

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

async function findKnownPlaceForVisitor(visitorId) {
  if (!visitorId) return null;
  const prior = await Visit.findOne({
    visitorId,
    city: { $nin: [null, '', 'Unknown', 'Atlantic Ocean'] },
  })
    .sort({ createdAt: -1 })
    .select('city state country countryCode geoSource')
    .lean();
  if (!prior) return null;
  const city = cleanPlaceName(prior.city);
  const state = cleanPlaceName(prior.state);
  if (!city && !state) return null;
  return {
    city,
    state,
    country: prior.country || null,
    countryCode: prior.countryCode || null,
    geoSource: prior.geoSource === 'gps' ? 'gps' : 'known',
  };
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
    const hasGps = isValidLatLon(latitude, longitude);
    const clientCity = cleanPlaceName(req.body?.city);
    const clientState = cleanPlaceName(req.body?.state);
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

    const vpnExitCity = vpnLike ? (ipGeo.city || null) : null;
    const vpnExitState = vpnLike ? (ipGeo.state || null) : null;

    let city = null;
    let state = null;
    let country = ipGeo.country || null;
    let countryCode = ipGeo.countryCode || null;
    let geoSource = 'unknown';

    // 1) Prefer valid client GPS city
    if (clientCity || clientState) {
      city = clientCity;
      state = clientState;
      country = clientCountry || country;
      geoSource = 'gps';
    } else if (hasGps) {
      // 2) Server reverse-geocode
      const gps = await reverseGeocode(latitude, longitude);
      if (gps?.city || gps?.state) {
        city = gps.city || null;
        state = gps.state || null;
        country = gps.country || country;
        countryCode = gps.countryCode || countryCode;
        geoSource = 'gps';
      }
    }

    // 3) Non-VPN: use IP city
    if (!city && !vpnLike && (ipGeo.city || ipGeo.state)) {
      city = ipGeo.city || null;
      state = ipGeo.state || null;
      country = ipGeo.country || country;
      countryCode = ipGeo.countryCode || countryCode;
      geoSource = 'ip';
    }

    // 4) VPN / still unknown: reuse this visitor's last known real city (e.g. Dadri from earlier GPS)
    if (!city) {
      const known = await findKnownPlaceForVisitor(visitorId);
      if (known) {
        city = known.city;
        state = known.state;
        country = known.country || country;
        countryCode = known.countryCode || countryCode;
        geoSource = known.geoSource;
      }
    }

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
