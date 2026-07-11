const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

function parseDate(dateStr) {
  if (!dateStr) return new Date();

  const trimmed = String(dateStr).trim();
  const parts = trimmed.split(/[-/.]/).map((p) => parseInt(p, 10));
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    const [a, b, c] = parts;
    // DD/MM/YYYY or DD-MM-YYYY (day first when last part is year)
    if (c > 1900) return new Date(c, b - 1, a);
    // YYYY-MM-DD
    if (a > 1900) return new Date(a, b - 1, c);
    // MM/DD/YY style with 2-digit year
    if (c < 100) return new Date(2000 + c, b - 1, a);
  }

  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) return d;

  return new Date();
}

function getSunSign(month, day) {
  const ranges = [
    [1, 20, 'Capricorn'], [2, 19, 'Aquarius'], [3, 20, 'Pisces'],
    [4, 20, 'Aries'], [5, 21, 'Taurus'], [6, 21, 'Gemini'],
    [7, 22, 'Cancer'], [8, 23, 'Leo'], [9, 23, 'Virgo'],
    [10, 23, 'Libra'], [11, 22, 'Scorpio'], [12, 22, 'Sagittarius'],
    [12, 31, 'Capricorn'],
  ];
  for (const [m, d, sign] of ranges) {
    if (month < m || (month === m && day <= d)) return sign;
  }
  return 'Aries';
}

function getMoonLongitudeApprox(date) {
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const lunarCycle = 27.321661 * 24 * 60 * 60 * 1000;
  const elapsed = date.getTime() - knownNewMoon.getTime();
  const cycles = elapsed / lunarCycle;
  const moonDeg = ((cycles % 1) * 360 + 360) % 360;
  return moonDeg;
}

function longitudeToSign(longitude) {
  const idx = Math.floor(longitude / 30) % 12;
  return ZODIAC_SIGNS[idx];
}

function getNakshatra(longitude) {
  const idx = Math.floor(longitude / (360 / 27)) % 27;
  return NAKSHATRAS[idx];
}

function parseTime(timeStr) {
  const match = timeStr.match(/(\d{1,2})[:\s](\d{2})\s*(am|pm)?/i);
  if (!match) return { hours: 12, minutes: 0 };
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toLowerCase();
  if (ampm === 'pm' && hours < 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;
  return { hours, minutes };
}

function getLagnaSign(hours, minutes, lat = 28.6) {
  const lst = (hours + minutes / 60 + lat / 15) % 24;
  const ascIndex = Math.floor((lst / 2) % 12);
  return ZODIAC_SIGNS[ascIndex];
}

function getPlanetPositions(date, sunSign) {
  const dayOfYear = Math.floor(
    (date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24),
  );
  const moonLong = getMoonLongitudeApprox(date);
  const positions = {
    Sun: sunSign,
    Moon: longitudeToSign(moonLong),
    Mars: ZODIAC_SIGNS[(dayOfYear + 3) % 12],
    Mercury: ZODIAC_SIGNS[(dayOfYear + 7) % 12],
    Jupiter: ZODIAC_SIGNS[(Math.floor(date.getFullYear() / 12) + dayOfYear) % 12],
    Venus: ZODIAC_SIGNS[(dayOfYear + 11) % 12],
    Saturn: ZODIAC_SIGNS[(date.getFullYear() % 12)],
    Rahu: ZODIAC_SIGNS[(date.getFullYear() + 4) % 12],
    Ketu: ZODIAC_SIGNS[(date.getFullYear() + 10) % 12],
  };
  return positions;
}

function getDashaLord(nakshatra) {
  const lords = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const idx = NAKSHATRAS.indexOf(nakshatra);
  return lords[idx % 9];
}

export function generateKundli({ dateOfBirth, birthTime, birthPlace }) {
  const date = parseDate(dateOfBirth);
  const { hours, minutes } = parseTime(birthTime || '12:00');
  const sunSign = getSunSign(date.getMonth() + 1, date.getDate());
  const moonLong = getMoonLongitudeApprox(date);
  const moonSign = longitudeToSign(moonLong);
  const nakshatra = getNakshatra(moonLong);
  const lagna = getLagnaSign(hours, minutes);
  const planets = getPlanetPositions(date, sunSign);
  const dashaLord = getDashaLord(nakshatra);

  const houses = ZODIAC_SIGNS.map((sign, i) => ({
    house: i + 1,
    sign,
    planets: PLANETS.filter((p) => planets[p] === sign),
  }));

  return {
    birthDetails: { dateOfBirth, birthTime, birthPlace },
    sunSign,
    moonSign,
    lagna,
    nakshatra,
    nakshatraLord: dashaLord,
    currentDasha: dashaLord,
    planets,
    houses,
    summary: `Born under ${sunSign} Sun, ${moonSign} Moon, ${lagna} Lagna in ${nakshatra} Nakshatra at ${birthPlace}.`,
    predictions: {
      marriage: `7th house influenced by ${planets.Venus} — marriage prospects strong after age ${22 + (date.getDate() % 5)}.`,
      career: `10th house guided by ${planets.Saturn} — career growth in fields related to ${sunSign} energy.`,
      health: `6th house shows moderate vitality — maintain balance through spiritual practices.`,
      finance: `2nd and 11th houses favor steady wealth accumulation after ${2024 + (date.getMonth() % 3)}.`,
    },
  };
}

export function formatKundliForAI(kundli) {
  if (!kundli) return '';
  return `
KUNDLI DETAILS:
- Date of Birth: ${kundli.birthDetails.dateOfBirth}
- Birth Time: ${kundli.birthDetails.birthTime}
- Birth Place: ${kundli.birthDetails.birthPlace}
- Sun Sign (Rashi): ${kundli.sunSign}
- Moon Sign: ${kundli.moonSign}
- Lagna (Ascendant): ${kundli.lagna}
- Nakshatra: ${kundli.nakshatra}
- Current Dasha Lord: ${kundli.currentDasha}
- Planetary Positions: ${JSON.stringify(kundli.planets)}
- Summary: ${kundli.summary}
`.trim();
}
