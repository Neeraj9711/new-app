const TITHIS = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima/Amavasya',
];

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

const VARAS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getMoonPhase(date) {
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const synodicMonth = 29.53058867;
  const days = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
  const phase = ((days % synodicMonth) + synodicMonth) % synodicMonth;
  return phase;
}

function getTithi(date) {
  const phase = getMoonPhase(date);
  const tithiNum = Math.floor(phase / (29.53058867 / 30)) + 1;
  if (tithiNum === 15 || tithiNum === 30) {
    return phase < 14.76 ? 'Amavasya (New Moon)' : 'Purnima (Full Moon)';
  }
  const idx = ((tithiNum - 1) % 15);
  const paksha = tithiNum <= 15 ? 'Shukla' : 'Krishna';
  return `${paksha} ${TITHIS[idx]}`;
}

function getNakshatra(date) {
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const lunarCycle = 27.321661;
  const days = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
  const idx = Math.floor((days % lunarCycle) / (lunarCycle / 27)) % 27;
  return NAKSHATRAS[idx];
}

function findUpcomingTithi(targetName, fromDate, months = 6) {
  const results = [];
  const end = new Date(fromDate);
  end.setMonth(end.getMonth() + months);

  for (let d = new Date(fromDate); d <= end; d.setDate(d.getDate() + 1)) {
    const tithi = getTithi(new Date(d));
    if (tithi.toLowerCase().includes(targetName.toLowerCase())) {
      results.push({
        date: d.toISOString().split('T')[0],
        day: VARAS[d.getDay()],
        tithi,
        nakshatra: getNakshatra(new Date(d)),
      });
    }
  }
  return results;
}

export function getTodayPanchang(date = new Date()) {
  const phase = getMoonPhase(date);
  const tithi = getTithi(date);
  const isEkadashi = tithi.toLowerCase().includes('ekadashi');
  const isAmavasya = tithi.toLowerCase().includes('amavasya');
  const isPurnima = tithi.toLowerCase().includes('purnima');

  return {
    date: date.toISOString().split('T')[0],
    day: VARAS[date.getDay()],
    tithi,
    nakshatra: getNakshatra(date),
    yoga: ['Vishkumbha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana'][date.getDate() % 5],
    karana: ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja'][date.getDay() % 5],
    sunrise: '06:12 AM',
    sunset: '06:45 PM',
    moonrise: '07:30 PM',
    moonPhase: phase < 14.76 ? 'Waning' : 'Waxing',
    special: isEkadashi ? 'Today is Ekadashi — auspicious for fasting and spiritual practices.' :
      isAmavasya ? 'Today is Amavasya — ideal for ancestor rituals (Pitru Tarpan).' :
      isPurnima ? 'Today is Purnima — powerful for meditation and charity.' : null,
    rahuKaal: ['07:30-09:00', '15:00-16:30', '12:00-13:30', '13:30-15:00', '10:30-12:00', '09:00-10:30', '16:30-18:00'][date.getDay()],
    abhijitMuhurat: '11:48 AM - 12:36 PM',
  };
}

export function getEkadashiDates(fromDate = new Date()) {
  return findUpcomingTithi('ekadashi', fromDate, 12);
}

export function getAmavasyaDates(fromDate = new Date()) {
  return findUpcomingTithi('amavasya', fromDate, 12);
}
