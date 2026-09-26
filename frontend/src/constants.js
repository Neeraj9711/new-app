import { ZODIAC_SEO } from '../../seoConfig.js';

export const ZODIAC_SIGNS = ZODIAC_SEO.map((z) => ({
  sign: z.sign,
  symbol: z.symbol,
  slug: z.slug,
  enSlug: z.enSlug,
}));

export function getZodiacBySlug(slug) {
  if (!slug) return null;
  const s = String(slug).toLowerCase();
  return ZODIAC_SIGNS.find(
    (z) => z.slug === s || z.enSlug === s || z.sign.toLowerCase() === s,
  ) || null;
}

export function rashifalPath(zodiac) {
  return `/rashifal/${zodiac.slug}`;
}

export const AI_SERVICES = [
  { id: 'chat', path: '/chat', title: 'AI Astrologer', subtitle: 'Chat with Pandit Ji', icon: '💬', color: '#E8A317' },
  { id: 'kundli', path: '/kundli', title: 'Free Kundli', subtitle: 'Birth chart in 30s', icon: '🔮', color: '#6B3FA0' },
  { id: 'horoscope', path: '/horoscope', title: 'Daily Horoscope', subtitle: 'Your star forecast', icon: '☀️', color: '#FF6B35' },
  { id: 'panchang', path: '/panchang', title: 'Today Panchang', subtitle: 'Tithi & Nakshatra', icon: '📅', color: '#2ECC71' },
];

export const QUICK_PROMPTS = [
  'Will I get married soon?',
  'Career guidance',
  'Health predictions',
  'Financial outlook',
  'When is my lucky period?',
];
