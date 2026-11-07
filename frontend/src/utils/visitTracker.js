import { analyticsApi } from '../services/api';
import { getGuestId } from './guestId';

const GPS_CACHE_KEY = 'astro_gps_geo';

let gpsRequestInFlight = null;

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

export function readCachedGps() {
  try {
    const raw = localStorage.getItem(GPS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.city || parsed?.state || (Number.isFinite(parsed?.latitude) && Number.isFinite(parsed?.longitude))) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeCachedGps(payload) {
  try {
    localStorage.setItem(GPS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

async function reverseGeocodeClient(latitude, longitude) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      city: data.city || data.locality || data.localityInfo?.administrative?.[3]?.name || null,
      state: data.principalSubdivision || null,
      country: data.countryName || null,
      latitude,
      longitude,
    };
  } catch {
    return null;
  }
}

/** Request browser GPS automatically (native browser prompt only — no in-app choice). */
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
        const place = (await reverseGeocodeClient(latitude, longitude)) || {
          latitude,
          longitude,
          city: null,
          state: null,
          country: null,
        };
        writeCachedGps(place);
        resolve(place);
      },
      () => resolve(null),
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 10 * 60 * 1000,
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

  return analyticsApi.visit(visitorId, pathname, referrer, {
    ...meta,
    latitude: gps?.latitude,
    longitude: gps?.longitude,
    city: gps?.city,
    state: gps?.state,
    country: gps?.country,
  });
}

/**
 * Track anonymous page visits and always try to capture GPS city by default.
 */
export function trackWebsiteVisit(pathname) {
  if (!pathname || pathname.startsWith('/admin')) return;

  const cached = readCachedGps();
  postVisit(pathname, cached);

  // Always request location unless we already have a city from GPS
  if (cached?.city || cached?.state) return;

  requestPreciseLocation().then((place) => {
    if (!place) return;
    postVisit(pathname, place);
  });
}
