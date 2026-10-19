export const SITE_ORIGIN = process.env.PUBLIC_SITE_URL || 'https://meraastro.in';
export const OG_IMAGE = `${SITE_ORIGIN}/og-image.jpg`;

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

const NOINDEX_PATHS = new Set(['/login', '/admin']);

const HOME_FAQ = [
  {
    q: 'Mera Astro पर कुंडली मुफ्त है?',
    a: 'हाँ। जन्म तिथि, समय और स्थान डालकर 30 सेकंड में मुफ्त कुंडली बनती है — लग्न, नक्षत्र और सूर्य-चंद्र राशि सहित।',
  },
  {
    q: 'पंडित जी से कैसे बात करें?',
    a: 'https://meraastro.in/chat पर खोलें। AI पंडित जी 24×7 विवाह, करियर, धन और स्वास्थ्य के सवालों का वैदिक उत्तर देते हैं।',
  },
  {
    q: 'आज का राशिफल कहाँ पढ़ें?',
    a: '12 राशियों का आज का राशिफल /horoscope और /rashifal पर है। मेष से मीन तक हिंदी और अंग्रेज़ी में पढ़ सकते हैं।',
  },
  {
    q: 'आज का पंचांग कैसे देखें?',
    a: '/panchang पर तिथि, नक्षत्र, योग, करण, सूर्योदय, सूर्यास्त और राहु काल एक जगह मिलते हैं।',
  },
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
    description: 'पंडित जी से 24×7 बात करें। मुफ्त कुंडली, दैनिक राशिफल और आज का पंचांग — भारत का AI वैदिक ज्योतिष। Talk to Pandit Ji on https://meraastro.in.',
    h1: 'मुफ्त कुंडली, राशिफल और पंचांग',
    body: 'Mera Astro पर मुफ्त जन्म कुंडली बनाएं, 12 राशियों का आज का राशिफल पढ़ें और आज का पंचांग (तिथि, नक्षत्र, राहु काल) देखें।',
  },
  '/kundli': {
    title: 'मुफ्त कुंडली बनाएं | Free Kundli Online | Mera Astro',
    description: 'जन्म तिथि, समय और स्थान से 30 सेकंड में मुफ्त कुंडली। लग्न, नक्षत्र, सूर्य-चंद्र राशि। Free birth chart on https://meraastro.in.',
    h1: 'मुफ्त कुंडली बनाएं',
    body: 'अपनी जन्म तिथि, जन्म समय और जन्म स्थान डालें। लग्न, नक्षत्र और राशि सहित जन्म कुंडली तुरंत तैयार होती है।',
  },
  '/panchang': {
    title: 'आज का पंचांग | Today Panchang, Rahu Kaal | Mera Astro',
    description: 'आज का पंचांग — तिथि, नक्षत्र, योग, करण, सूर्योदय, सूर्यास्त और राहु काल। Today Hindu panchang on https://meraastro.in.',
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
    description: 'विवाह, करियर, स्वास्थ्य और धन के बारे में AI पंडित जी से पूछें। 24×7 वैदिक ज्योतिष चैट on https://meraastro.in.',
    h1: 'पंडित जी से चैट करें',
    body: 'जन्म विवरण बताएं और विवाह, करियर या धन के बारे में व्यक्तिगत वैदिक सलाह पाएं।',
  },
  '/reel': {
    title: 'AI पंडित जी से पूछें | Mera Astro Instagram',
    description: 'AI पंडित जी से 24×7 पूछें। मुफ्त कुंडली, राशिफल और पंचांग — https://meraastro.in',
    h1: 'AI पंडित जी से पूछो',
    body: 'Instagram से आए मित्रों के लिए: पंडित जी से विवाह, करियर और धन के बारे में मुफ्त पूछें। कुंडली 30 सेकंड में।',
  },
  '/privacy': {
    title: 'Privacy Policy | Mera Astro AI',
    description: 'How Mera Astro collects, uses and protects account and astrology data.',
    h1: 'Privacy Policy',
    body: 'Astro AI privacy policy for account, Kundli and chat data.',
  },
  '/login': {
    title: 'Sign in | Mera Astro',
    description: 'Sign in to Mera Astro with Google.',
    h1: 'Sign in',
    body: 'Google sign-in for Mera Astro.',
    robots: 'noindex, nofollow',
  },
  '/admin': {
    title: 'Admin | Mera Astro',
    description: 'Admin portal.',
    h1: 'Admin',
    body: 'Internal admin.',
    robots: 'noindex, nofollow',
  },
};

function defaultAlternates(canonical) {
  return [
    { hreflang: 'hi', href: canonical },
    { hreflang: 'en', href: canonical },
    { hreflang: 'x-default', href: canonical },
  ];
}

function buildJsonLd(seo, path) {
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE_ORIGIN}/#organization`,
      name: 'Mera Astro AI',
      url: SITE_ORIGIN,
      logo: OG_IMAGE,
      description: 'AI-powered Vedic astrology — free Kundli, daily horoscope, Panchang, and 24×7 Pandit Ji chat.',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_ORIGIN}/#website`,
      name: 'Mera Astro',
      url: SITE_ORIGIN,
      inLanguage: ['hi', 'en'],
      publisher: { '@id': `${SITE_ORIGIN}/#organization` },
    },
    {
      '@type': 'WebPage',
      '@id': `${seo.canonical}#webpage`,
      url: seo.canonical,
      name: seo.title,
      description: seo.description,
      inLanguage: 'hi',
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      primaryImageOfPage: OG_IMAGE,
    },
  ];

  if (path === '/') {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: HOME_FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

export function getSeoForPath(pathname) {
  const path = (pathname || '/').replace(/\/+$/, '') || '/';
  const signMatch = path.match(/^\/(?:rashifal|horoscope)\/([^/]+)$/);
  if (signMatch) {
    const z = resolveZodiac(signMatch[1]);
    if (z) {
      const hiUrl = `${SITE_ORIGIN}/rashifal/${z.slug}`;
      const enUrl = `${SITE_ORIGIN}/horoscope/${z.enSlug}`;
      const seo = {
        title: `आज का ${z.hi} राशिफल | ${z.sign} Horoscope Today | Mera Astro`,
        description: `${z.hi} (${z.sign}) राशि का आज का राशिफल — प्रेम, करियर, धन और स्वास्थ्य। Free daily ${z.sign} horoscope on https://meraastro.in.`,
        canonical: hiUrl,
        h1: `आज का ${z.hi} राशिफल (${z.sign})`,
        body: `${z.hi} राशि का आज का वैदिक राशिफल पढ़ें। करियर, प्रेम, धन और स्वास्थ्य का पूर्वानुमान, फिर मुफ्त कुंडली बनाएं या पंडित जी से चैट करें।`,
        robots: 'index, follow',
        lang: 'hi',
        image: OG_IMAGE,
        alternates: [
          { hreflang: 'hi', href: hiUrl },
          { hreflang: 'en', href: enUrl },
          { hreflang: 'x-default', href: hiUrl },
        ],
      };
      seo.jsonLd = buildJsonLd(seo, path);
      return seo;
    }
  }

  const page = STATIC_SEO[path];
  if (!page) {
    const seo = {
      title: 'Page not found | Mera Astro',
      description: 'This page is not available on Mera Astro.',
      canonical: `${SITE_ORIGIN}${path}`,
      h1: 'Page not found',
      body: 'The page you requested does not exist.',
      robots: 'noindex, nofollow',
      lang: 'en',
      image: OG_IMAGE,
      alternates: [],
      notFound: true,
    };
    seo.jsonLd = buildJsonLd(seo, path);
    return seo;
  }

  const canonical = `${SITE_ORIGIN}${path === '/' ? '/' : path}`;
  const seo = {
    ...page,
    canonical,
    robots: page.robots || (NOINDEX_PATHS.has(path) ? 'noindex, nofollow' : 'index, follow'),
    lang: 'hi',
    image: OG_IMAGE,
    alternates: defaultAlternates(canonical),
  };
  seo.jsonLd = buildJsonLd(seo, path);
  return seo;
}

export function sitemapPaths() {
  return [
    '/',
    '/kundli',
    '/panchang',
    '/horoscope',
    '/chat',
    '/reel',
    '/privacy',
    ...ZODIAC_SEO.map((z) => `/rashifal/${z.slug}`),
  ];
}

export { HOME_FAQ };
