import { analyticsApi } from '../services/api';
import { getGuestId } from './guestId';

const GPS_CACHE_KEY = 'astro_gps_geo';
const GPS_CACHE_VERSION = 2;

let gpsRequestInFlight = null;

const INVALID_PLACE_RE =
  /\b(ocean|sea|atlantic|pacific|indian ocean|arctic|antarctic|unknown|null|undefined)\b/i;

function cleanPlaceName(value) {
  const s = String(value || '').trim().replace(/\s+/g, ' ');
  if (!s || s.length < 2 || s.length > 80) return null;
  if (INVALID_PLACE_RE.test(s)) return null;
  const lower = s.toLowerCase();
  if (lower === 'n/a' || lower === 'na' || lower === '-' || lower === '—') return null;
  return s;
}

function isValidLatLon(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return false;
  if (Math.abs(latitude) < 0.01 && Math.abs(longitude) < 0.01) return false;
  return true;
}

function clientMeta() {
  let timezone = '';
  let language = '';
  let screen = '';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    /* ignore */
  }
  try {
    language = navigator.language || '';
  } catch {
    /* ignore */
  }
  try {
    screen = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
  } catch {
    /* ignore */
  }
  return { timezone, language, screen };
}

function sanitizeGps(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const city = cleanPlaceName(parsed.city);
  const state = cleanPlaceName(parsed.state);
  const country = cleanPlaceName(parsed.country) || parsed.country || null;
  const latitude = Number(parsed.latitude);
  const longitude = Number(parsed.longitude);
  const hasCoords = isValidLatLon(latitude, longitude);
  if (!city && !state && !hasCoords) return null;
  // Drop cached ocean junk even if coords exist — force a fresh reverse-geocode
  if (!city && !state && hasCoords) {
    return { latitude, longitude, city: null, state: null, country: null, v: GPS_CACHE_VERSION };
  }
  return {
    city,
    state,
    country,
    latitude: hasCoords ? latitude : undefined,
    longitude: hasCoords ? longitude : undefined,
    v: GPS_CACHE_VERSION,
  };
}

export function readCachedGps() {
  try {
    const raw = localStorage.getItem(GPS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const clean = sanitizeGps(parsed);
    // Invalidate old bad caches (e.g. Atlantic Ocean)
    if (parsed?.city && !cleanPlaceName(parsed.city)) {
      localStorage.removeItem(GPS_CACHE_KEY);
      return null;
    }
    if (clean && (clean.city || clean.state)) return clean;
    if (clean && isValidLatLon(clean.latitude, clean.longitude)) return clean;
  } catch {
    /* ignore */
  }
  return null;
}

function writeCachedGps(payload) {
  try {
    const clean = sanitizeGps(payload);
    if (!clean) {
      localStorage.removeItem(GPS_CACHE_KEY);
      return;
    }
    // Only persist when we have a real city/state
    if (!clean.city && !clean.state) {
      localStorage.removeItem(GPS_CACHE_KEY);
      return;
    }
    localStorage.setItem(GPS_CACHE_KEY, JSON.stringify(clean));
  } catch {
    /* ignore */
  }
}

async function reverseGeocodeClient(latitude, longitude) {
  if (!isValidLatLon(latitude, longitude)) return null;
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const candidates = [
      data.city,
      data.locality,
      data.localityInfo?.administrative?.[3]?.name,
      data.localityInfo?.administrative?.[2]?.name,
      data.localityInfo?.administrative?.[1]?.name,
    ];
    let city = null;
    for (const c of candidates) {
      city = cleanPlaceName(c);
      if (city) break;
    }
    const state = cleanPlaceName(data.principalSubdivision);
    const country = data.countryName || null;
    if (!city && !state) return null;
    return { city, state, country, latitude, longitude };
  } catch {
    return null;
  }
}

/** Request browser GPS automatically (native browser prompt only). */
export function requestPreciseLocation() {
  if (gpsRequestInFlight) return gpsRequestInFlight;

  gpsRequestInFlight = new Promise((resolve) => {
    if (!navigator?.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        // Prefer more accurate fix when available
        const place = await reverseGeocodeClient(latitude, longitude);
        if (place?.city || place?.state) {
          writeCachedGps(place);
          resolve(place);
          return;
        }
        resolve(null);
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  }).finally(() => {
    gpsRequestInFlight = null;
  });

  return gpsRequestInFlight;
}

function postVisit(pathname, gps) {
  const visitorId = getGuestId();
  const referrer = typeof document !== 'undefined' ? (document.referrer || '') : '';
  const meta = clientMeta();
  const city = cleanPlaceName(gps?.city);
  const state = cleanPlaceName(gps?.state);

  return analyticsApi.visit(visitorId, pathname, referrer, {
    ...meta,
    latitude: isValidLatLon(gps?.latitude, gps?.longitude) ? gps.latitude : null,
    longitude: isValidLatLon(gps?.latitude, gps?.longitude) ? gps.longitude : null,
    city: city || '',
    state: state || '',
    country: gps?.country || '',
  });
}

/**
 * Track anonymous page visits. Rejects bogus GPS cities (e.g. Atlantic Ocean)
 * so the server can fall back to ISP/IP city.
 */
export function trackWebsiteVisit(pathname) {
  if (!pathname || pathname.startsWith('/admin')) return;

  const cached = readCachedGps();
  postVisit(pathname, cached);

  if (cached?.city || cached?.state) return;

  requestPreciseLocation().then((place) => {
    if (!place?.city && !place?.state) return;
    postVisit(pathname, place);
  });
}
