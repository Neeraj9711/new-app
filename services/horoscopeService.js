const ZODIAC = [
  { sign: 'Aries', symbol: '♈', element: 'Fire', dates: 'Mar 21 – Apr 19' },
  { sign: 'Taurus', symbol: '♉', element: 'Earth', dates: 'Apr 20 – May 20' },
  { sign: 'Gemini', symbol: '♊', element: 'Air', dates: 'May 21 – Jun 20' },
  { sign: 'Cancer', symbol: '♋', element: 'Water', dates: 'Jun 21 – Jul 22' },
  { sign: 'Leo', symbol: '♌', element: 'Fire', dates: 'Jul 23 – Aug 22' },
  { sign: 'Virgo', symbol: '♍', element: 'Earth', dates: 'Aug 23 – Sep 22' },
  { sign: 'Libra', symbol: '♎', element: 'Air', dates: 'Sep 23 – Oct 22' },
  { sign: 'Scorpio', symbol: '♏', element: 'Water', dates: 'Oct 23 – Nov 21' },
  { sign: 'Sagittarius', symbol: '♐', element: 'Fire', dates: 'Nov 22 – Dec 21' },
  { sign: 'Capricorn', symbol: '♑', element: 'Earth', dates: 'Dec 22 – Jan 19' },
  { sign: 'Aquarius', symbol: '♒', element: 'Air', dates: 'Jan 20 – Feb 18' },
  { sign: 'Pisces', symbol: '♓', element: 'Water', dates: 'Feb 19 – Mar 20' },
];

const MOODS = ['Blessed', 'Energetic', 'Reflective', 'Creative', 'Focused', 'Peaceful'];
const COLORS = ['Saffron', 'White', 'Green', 'Blue', 'Red', 'Yellow', 'Purple', 'Gold'];

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function stars(seed, max = 5) {
  return Math.floor(seededRandom(seed) * 2) + (max - 2);
}

export function getDailyHoroscope(sign, date = new Date()) {
  const zodiac = ZODIAC.find((z) => z.sign.toLowerCase() === sign.toLowerCase()) || ZODIAC[0];
  const seed = date.getDate() + date.getMonth() * 31 + zodiac.sign.length;

  return {
    sign: zodiac.sign,
    symbol: zodiac.symbol,
    element: zodiac.element,
    dates: zodiac.dates,
    date: date.toISOString().split('T')[0],
    mood: MOODS[Math.floor(seededRandom(seed) * MOODS.length)],
    love: stars(seed + 1),
    career: stars(seed + 2),
    money: stars(seed + 3),
    health: stars(seed + 4),
    luckyNumber: Math.floor(seededRandom(seed + 5) * 9) + 1,
    luckyColor: COLORS[Math.floor(seededRandom(seed + 6) * COLORS.length)],
    forecast: `${zodiac.sign}, the cosmic energies today favor ${zodiac.element.toLowerCase()} sign qualities. ` +
      `Planetary alignments suggest focusing on personal growth and relationships. ` +
      `Mercury's influence brings clarity in communication — an excellent day for important conversations.`,
    loveText: seededRandom(seed + 7) > 0.5
      ? 'Romance is in the air. Open your heart to new possibilities.'
      : 'Focus on deepening existing bonds. Patience brings rewards.',
    careerText: seededRandom(seed + 8) > 0.5
      ? 'A professional opportunity may arise. Stay alert and prepared.'
      : 'Steady progress at work. Your dedication will be noticed.',
  };
}

export function getAllHoroscopes(date = new Date()) {
  return ZODIAC.map((z) => getDailyHoroscope(z.sign, date));
}

export { ZODIAC };
