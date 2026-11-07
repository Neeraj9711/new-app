import { getClientIp } from './activityService.js';

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

async function lookupIpWhoIs(ip) {
  const data = await fetchJson(`https://ipwho.is/${encodeURIComponent(ip)}`);
  if (!data || data.success === false) return null;
  return {
    ip,
    city: data.city || null,
    state: data.region || data.region_code || null,
    country: data.country || null,
    countryCode: data.country_code || null,
  };
}

async function lookupIpApiCom(ip) {
  // Free endpoint is HTTP-only; fine from Render server-side.
  const data = await fetchJson(
    `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,regionName,city,query`,
  );
  if (!data || data.status !== 'success') return null;
  return {
    ip: data.query || ip,
    city: data.city || null,
    state: data.regionName || null,
    country: data.country || null,
    countryCode: data.countryCode || null,
  };
}

async function lookupIpApiCo(ip) {
  const data = await fetchJson(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
  if (!data || data.error) return null;
  return {
    ip,
    city: data.city || null,
    state: data.region || data.region_code || null,
    country: data.country_name || null,
    countryCode: data.country_code || null,
  };
}

export async function lookupGeoByIp(ip) {
  const normalized = normalizeIp(ip);
  if (!normalized || isPrivateIp(normalized)) {
    return {
      ip: normalized,
      city: 'Local',
      state: 'Local',
      country: 'Local',
      countryCode: null,
    };
  }

  const cached = cache.get(normalized);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  const empty = {
    ip: normalized,
    city: null,
    state: null,
    country: null,
    countryCode: null,
  };

  try {
    const geo =
      (await lookupIpWhoIs(normalized))
      || (await lookupIpApiCom(normalized))
      || (await lookupIpApiCo(normalized))
      || empty;
    cache.set(normalized, { at: Date.now(), data: geo });
    return geo;
  } catch (err) {
    console.error('Geo lookup failed:', err.message);
    cache.set(normalized, { at: Date.now(), data: empty });
    return empty;
  }
}

export async function resolveRequestGeo(req) {
  const ip = getClientIp(req);
  return lookupGeoByIp(ip);
}
