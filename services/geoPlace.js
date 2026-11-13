/** Shared place-name validation for GPS / IP geo. */

const INVALID_PLACE_RE =
  /\b(ocean|sea|atlantic|pacific|indian ocean|arctic|antarctic|gulf of|bay of bengay|unknown|null|undefined|locality|continent)\b/i;

const INVALID_EXACT = new Set([
  'atlantic ocean',
  'pacific ocean',
  'indian ocean',
  'arctic ocean',
  'southern ocean',
  'unknown',
  'null',
  'undefined',
  'n/a',
  'na',
  '-',
  '—',
]);

export function cleanPlaceName(value) {
  const s = String(value || '').trim().replace(/\s+/g, ' ');
  if (!s || s.length < 2 || s.length > 80) return null;
  if (INVALID_EXACT.has(s.toLowerCase())) return null;
  if (INVALID_PLACE_RE.test(s)) return null;
  return s;
}

export function isValidLatLon(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return false;
  // Null-island / default junk
  if (Math.abs(latitude) < 0.01 && Math.abs(longitude) < 0.01) return false;
  return true;
}

/**
 * Pick a real city-like name from BigDataCloud reverse-geocode payload.
 */
export function cityFromBigDataCloud(data) {
  if (!data || typeof data !== 'object') return null;

  const candidates = [
    data.city,
    data.locality,
    data.localityInfo?.administrative?.[3]?.name,
    data.localityInfo?.administrative?.[2]?.name,
    data.localityInfo?.administrative?.[1]?.name,
  ];

  for (const c of candidates) {
    const cleaned = cleanPlaceName(c);
    if (cleaned) return cleaned;
  }
  return null;
}

export function stateFromBigDataCloud(data) {
  return cleanPlaceName(data?.principalSubdivision) || null;
}
