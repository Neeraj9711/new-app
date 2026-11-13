import { getClientIp } from './activityService.js';
import {
  cityFromBigDataCloud,
  cleanPlaceName,
  isValidLatLon,
  stateFromBigDataCloud,
} from './geoPlace.js';

const cache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function isPrivateIp(ip) {
  if (!ip) return true;
  const cleaned = ip.replace(/^::ffff:/, '');
  if (cleaned === '::1' || cleaned === '127.0.0.1') return true;
  if (/^10\./.test(cleaned)) return true;
  if (/^192\.168\./.test(cleaned)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(cleaned)) return true;
  return false;
}

export function normalizeIp(ip) {
  if (!ip) return null;
  return String(ip).replace(/^::ffff:/, '').trim() || null;
}

async function fetchJson(url, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function emptyGeo(ip) {
  return {
    ip,
    city: null,
    state: null,
    country: null,
    countryCode: null,
    isp: null,
    org: null,
    isProxy: false,
    isHosting: false,
    source: 'ip',
  };
}

async function lookupIpWhoIs(ip) {
  const data = await fetchJson(`https://ipwho.is/${encodeURIComponent(ip)}`);
  if (!data || data.success === false) return null;
  const org = data.connection?.org || null;
  const isp = data.connection?.isp || org;
  const text = `${org || ''} ${isp || ''}`.toLowerCase();
  const looksVpn = /vpn|proxy|hosting|m247|digitalocean|cloudflare|amazon|google|ovh|hetzner/.test(text);
  return {
    ip,
    city: cleanPlaceName(data.city),
    state: cleanPlaceName(data.region || data.region_code),
    country: data.country || null,
    countryCode: data.country_code || null,
    isp,
    org,
    isProxy: looksVpn,
    isHosting: looksVpn,
    source: 'ip',
  };
}

async function lookupIpApiCom(ip) {
  const data = await fetchJson(
    `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,regionName,city,isp,org,as,proxy,hosting,query`,
  );
  if (!data || data.status !== 'success') return null;
  return {
    ip: data.query || ip,
    city: cleanPlaceName(data.city),
    state: cleanPlaceName(data.regionName),
    country: data.country || null,
    countryCode: data.countryCode || null,
    isp: data.isp || null,
    org: data.org || null,
    isProxy: Boolean(data.proxy),
    isHosting: Boolean(data.hosting),
    source: 'ip',
  };
}

export async function lookupGeoByIp(ip) {
  const normalized = normalizeIp(ip);
  if (!normalized || isPrivateIp(normalized)) {
    return {
      ...emptyGeo(normalized),
      city: 'Local',
      state: 'Local',
      country: 'Local',
    };
  }

  const cached = cache.get(normalized);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const geo =
      (await lookupIpApiCom(normalized))
      || (await lookupIpWhoIs(normalized))
      || emptyGeo(normalized);
    cache.set(normalized, { at: Date.now(), data: geo });
    return geo;
  } catch (err) {
    console.error('Geo lookup failed:', err.message);
    const empty = emptyGeo(normalized);
    cache.set(normalized, { at: Date.now(), data: empty });
    return empty;
  }
}

export async function reverseGeocode(lat, lon) {
  if (!isValidLatLon(lat, lon)) return null;
  const latitude = Number(lat);
  const longitude = Number(lon);

  const bdc = await fetchJson(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
    4000,
  );
  if (bdc) {
    const city = cityFromBigDataCloud(bdc);
    const state = stateFromBigDataCloud(bdc);
    const country = bdc.countryName || null;
    // Reject ocean / water-only results even if country is set
    if (city || state) {
      return {
        city,
        state,
        country,
        countryCode: bdc.countryCode || null,
        source: 'gps',
      };
    }
  }

  const data = await fetchJson(
    `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`,
    4000,
  );
  const place = data?.results?.[0];
  if (!place) return null;
  const city = cleanPlaceName(place.name || place.admin2);
  const state = cleanPlaceName(place.admin1);
  if (!city && !state) return null;
  return {
    city,
    state,
    country: place.country || null,
    countryCode: place.country_code || null,
    source: 'gps',
  };
}

export async function resolveRequestGeo(req) {
  const ip = getClientIp(req);
  return lookupGeoByIp(ip);
}

export { cleanPlaceName, isValidLatLon };
