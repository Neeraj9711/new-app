export const SITE_ORIGIN = process.env.PUBLIC_SITE_URL || 'https://meraastro.in';

export const ZODIAC_SEO = [
  { sign: 'Aries', slug: 'mesh', enSlug: 'aries', hi: 'मेष', symbol: '♈' },
  { sign: 'Taurus', slug: 'vrishabh', enSlug: 'taurus', hi: 'वृषभ', symbol: '♉' },
  { sign: 'Gemini', slug: 'mithun', enSlug: 'gemini', hi: 'मिथुन', symbol: '♊' },
  { sign: 'Cancer', slug: 'kark', enSlug: 'cancer', hi: 'कर्क', symbol: '♋' },
  { sign: 'Leo', slug: 'singh', enSlug: 'leo', hi: 'सिंह', symbol: '♌' },
  { sign: 'Virgo', slug: 'kanya', enSlug: 'virgo', hi: 'कन्या', symbol: '♍' },
  { sign: 'Libra', slug: 'tula', enSlug: 'libra', hi: 'तुला', symbol: '♎' },
  { sign: 'Scorpio', slug: 'vrishchik', enSlug: 'scorpio', hi: 'वृश्चिक', symbol: '♏' },
  { sign: 'Sagittarius', slug: 'dhanu', enSlug: 'sagittarius', hi: 'धनु', symbol: '♐' },
  { sign: 'Capricorn', slug: 'makar', enSlug: 'capricorn', hi: 'मकर', symbol: '♑' },
  { sign: 'Aquarius', slug: 'kumbh', enSlug: 'aquarius', hi: 'कुंभ', symbol: '♒' },
  { sign: 'Pisces', slug: 'meen', enSlug: 'pisces', hi: 'मीन', symbol: '♓' },
];

export function resolveZodiac(slug) {
  if (!slug) return null;
  const s = String(slug).toLowerCase();
  return ZODIAC_SEO.find(
    (z) => z.slug === s || z.enSlug === s || z.sign.toLowerCase() === s,
  ) || null;
}

const STATIC_SEO = {
  '/': {
    title: 'मुफ्त कुंडली, आज का राशिफल और पंचांग | Mera Astro AI',
    description: 'पंडित जी से 24×7 बात करें। मुफ्त कुंडली, दैनिक राशिफल और आज का पंचांग — भारत का AI वैदिक ज्योतिष। Talk to Pandit Ji on meraastro.in.',
    h1: 'मुफ्त कुंडली, राशिफल और पंचांग',
    body: 'Mera Astro पर मुफ्त जन्म कुंडली बनाएं, 12 राशियों का आज का राशिफल पढ़ें और आज का पंचांग (तिथि, नक्षत्र, राहु काल) देखें।',
  },
  '/kundli': {
    title: 'मुफ्त कुंडली बनाएं | Free Kundli Online | Mera Astro',
    description: 'जन्म तिथि, समय और स्थान से 30 सेकंड में मुफ्त कुंडली। लग्न, नक्षत्र, सूर्य-चंद्र राशि। Free birth chart on meraastro.in.',
    h1: 'मुफ्त कुंडली बनाएं',
    body: 'अपनी जन्म तिथि, जन्म समय और जन्म स्थान डालें। लग्न, नक्षत्र और राशि सहित जन्म कुंडली तुरंत तैयार होती है।',
  },
  '/panchang': {
    title: 'आज का पंचांग | Today Panchang, Rahu Kaal | Mera Astro',
    description: 'आज का पंचांग — तिथि, नक्षत्र, योग, करण, सूर्योदय, सूर्यास्त और राहु काल। Today Hindu panchang on meraastro.in.',
    h1: 'आज का पंचांग',
    body: 'आज की तिथि, नक्षत्र, योग, करण, राहु काल और अभिजीत मुहूर्त एक जगह। शुभ कार्य से पहले पंचांग देखें।',
  },
  '/horoscope': {
    title: 'आज का राशिफल | Daily Horoscope All 12 Signs | Mera Astro',
    description: '12 राशियों का आज का राशिफल — मेष से मीन। Daily horoscope for Aries to Pisces in Hindi and English.',
    h1: 'आज का राशिफल — 12 राशियाँ',
    body: 'मेष, वृषभ, मिथुन, कर्क, सिंह, कन्या, तुला, वृश्चिक, धनु, मकर, कुंभ और मीन का आज का राशिफल पढ़ें।',
  },
  '/chat': {
    title: 'पंडित जी से चैट करें | AI Astrologer 24×7 | Mera Astro',
    description: 'विवाह, करियर, स्वास्थ्य और धन के बारे में पंडित जी से पूछें। 24×7 AI वैदिक ज्योतिष चैट।',
    h1: 'पंडित जी से चैट करें',
    body: 'जन्म विवरण बताएं और विवाह, करियर या धन के बारे में व्यक्तिगत वैदिक सलाह पाएं।',
  },
};

export function getSeoForPath(pathname) {
  const path = (pathname || '/').replace(/\/+$/, '') || '/';
  const signMatch = path.match(/^\/(?:rashifal|horoscope)\/([^/]+)$/);
  if (signMatch) {
    const z = resolveZodiac(signMatch[1]);
    if (z) {
      return {
        title: `आज का ${z.hi} राशिफल | ${z.sign} Horoscope Today | Mera Astro`,
        description: `${z.hi} (${z.sign}) राशि का आज का राशिफल — प्रेम, करियर, धन और स्वास्थ्य। Free daily ${z.sign} horoscope.`,
        canonical: `${SITE_ORIGIN}/rashifal/${z.slug}`,
        h1: `आज का ${z.hi} राशिफल (${z.sign})`,
        body: `${z.hi} राशि का आज का वैदिक राशिफल पढ़ें। करियर, प्रेम, धन और स्वास्थ्य का पूर्वानुमान, फिर मुफ्त कुंडली बनाएं या पंडित जी से चैट करें।`,
      };
    }
  }
  const page = STATIC_SEO[path] || STATIC_SEO['/'];
  return {
    ...page,
    canonical: `${SITE_ORIGIN}${path === '/' ? '/' : path}`,
  };
}

export function sitemapPaths() {
  return [
    '/',
    '/kundli',
    '/panchang',
    '/horoscope',
    '/chat',
    ...ZODIAC_SEO.map((z) => `/rashifal/${z.slug}`),
    ...ZODIAC_SEO.map((z) => `/horoscope/${z.enSlug}`),
  ];
}
