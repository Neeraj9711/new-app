import { analyticsApi } from '../services/api';
import { getGuestId } from './guestId';

const GPS_CACHE_KEY = 'astro_gps_geo';
const GPS_ASKED_KEY = 'astro_gps_asked';

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

function readCachedGps() {
  try {
    const raw = sessionStorage.getItem(GPS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Number.isFinite(parsed?.latitude) && Number.isFinite(parsed?.longitude)) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeCachedGps(coords) {
  try {
    sessionStorage.setItem(GPS_CACHE_KEY, JSON.stringify(coords));
  } catch {
    /* ignore */
  }
}

function requestBrowserGps() {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        writeCachedGps(coords);
        resolve(coords);
      },
      () => resolve(null),
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 30 * 60 * 1000,
      },
    );
  });
}

/**
 * Track anonymous (and logged-in) page visits for the admin portal.
 * Uses IP geo by default; upgrades to browser GPS city/state when permission is granted.
 */
export async function trackWebsiteVisit(pathname) {
  if (!pathname || pathname.startsWith('/admin')) return;

  const visitorId = getGuestId();
  const referrer = typeof document !== 'undefined' ? (document.referrer || '') : '';
  const meta = clientMeta();

  let gps = readCachedGps();
  try {
    const asked = sessionStorage.getItem(GPS_ASKED_KEY);
    if (!gps && !asked) {
      sessionStorage.setItem(GPS_ASKED_KEY, '1');
      gps = await requestBrowserGps();
    }
  } catch {
    /* ignore */
  }

  analyticsApi.visit(visitorId, pathname, referrer, {
    ...meta,
    latitude: gps?.latitude,
    longitude: gps?.longitude,
  });
}
