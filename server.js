// Must be first so env vars are loaded before other modules read them at import time
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from './db/connect.js';
import { getAiProvider, GEMINI_MODEL, OPENAI_MODEL } from './services/aiService.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import chatRoutes from './routes/chat.js';
import kundliRoutes from './routes/kundli.js';
import panchangRoutes from './routes/panchang.js';
import horoscopeRoutes from './routes/horoscope.js';
import { SITE_ORIGIN, getSeoForPath, sitemapPaths } from './seoConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const clientDir = path.join(__dirname, 'client');
const clientIndex = path.join(clientDir, 'index.html');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const host = String(req.headers.host || '').split(':')[0];
  if (host === 'www.meraastro.in') {
    return res.redirect(301, `https://meraastro.in${req.originalUrl}`);
  }
  next();
});

// Existing static pages (privacy, etc.) — unchanged for mobile/legal links
app.use(express.static(publicDir, {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.xml') || filePath.endsWith('robots.txt')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    if (filePath.endsWith('.xml')) {
      res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    }
  },
}));

// ——— Mobile + web API (unchanged paths) ———
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Astro AI',
    version: '1.0.0',
    ai: getAiProvider(),
  });
});

app.get('/privacy', (_req, res) => {
  res.sendFile(path.join(publicDir, 'privacy.html'));
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/kundli', kundliRoutes);
app.use('/api/panchang', panchangRoutes);
app.use('/api/horoscope', horoscopeRoutes);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function injectSeoHtml(html, pathname) {
  const seo = getSeoForPath(pathname);
  let out = html.replace(/<html\s+lang="[^"]*"/, `<html lang="${escapeHtml(seo.lang || 'hi')}"`);
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(seo.title)}</title>`);
  if (out.includes('name="description"')) {
    out = out.replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    );
  }
  out = out.replace(/<link rel="canonical"[^>]*>/g, '');
  out = out.replace(/<link rel="alternate"[^>]*>/g, '');
  out = out.replace(/<meta property="og:[^"]+" content="[^"]*"\s*\/?>/g, '');
  out = out.replace(/<meta name="twitter:[^"]+" content="[^"]*"\s*\/?>/g, '');
  out = out.replace(/<meta name="robots" content="[^"]*"\s*\/?>/g, '');
  out = out.replace(/<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g, '');
  const alternates = (seo.alternates || [])
    .map((alt) => `<link rel="alternate" hreflang="${escapeHtml(alt.hreflang)}" href="${escapeHtml(alt.href)}" />`)
    .join('\n    ');
  const extra = `
    <link rel="canonical" href="${escapeHtml(seo.canonical)}" />
    ${alternates}
    <meta name="robots" content="${escapeHtml(seo.robots || 'index, follow')}" />
    <meta property="og:title" content="${escapeHtml(seo.title)}" />
    <meta property="og:description" content="${escapeHtml(seo.description)}" />
    <meta property="og:url" content="${escapeHtml(seo.canonical)}" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="${escapeHtml(seo.image)}" />
    <meta property="og:locale" content="hi_IN" />
    <meta property="og:site_name" content="Mera Astro AI" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(seo.title)}" />
    <meta name="twitter:description" content="${escapeHtml(seo.description)}" />
    <meta name="twitter:image" content="${escapeHtml(seo.image)}" />
    <script type="application/ld+json">${JSON.stringify(seo.jsonLd)}</script>
  `;
  out = out.replace('</head>', `${extra}</head>`);
  const prerender = `
    <noscript>
      <h1>${escapeHtml(seo.h1)}</h1>
      <p>${escapeHtml(seo.body)}</p>
    </noscript>
  `;
  return out.replace('</body>', `${prerender}</body>`);
}

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain; charset=utf-8').send(
    `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nDisallow: /login\n\nUser-agent: Googlebot\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.txt\nSitemap: ${SITE_ORIGIN}/sitemap.xml\nSitemap: ${SITE_ORIGIN}/pages.xml\n`,
  );
});

function sendSitemapXml(res) {
  const urls = sitemapPaths().map((pagePath) => {
    const loc = pagePath === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${pagePath}`;
    return `<url><loc>${loc}</loc></url>`;
  }).join('');
  res.status(200)
    .type('text/xml; charset=utf-8')
    .send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
}

app.get(['/sitemap.xml', '/pages.xml'], (_req, res) => {
  sendSitemapXml(res);
});

app.get('/sitemap.txt', (_req, res) => {
  const body = sitemapPaths()
    .map((pagePath) => (pagePath === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${pagePath}`))
    .join('\n');
  res.status(200).type('text/plain; charset=utf-8').send(`${body}\n`);
});

// ——— Web UI only (does not handle /api/*) ———
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir, { index: false }));
  app.get(/^(?!\/api).*/, (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (/\.(xml|txt)$/i.test(req.path) || req.path === '/robots.txt') return next();
    fs.readFile(clientIndex, 'utf8', (err, html) => {
      if (err) return next(err);
      const seo = getSeoForPath(req.path);
      if (seo.notFound) res.status(404);
      res.type('html').send(injectSeoHtml(html, req.path));
    });
  });
}

const provider = getAiProvider();
const aiMode = provider === 'gemini'
  ? `Gemini (${GEMINI_MODEL})`
  : provider === 'gpt'
    ? `GPT (${OPENAI_MODEL})`
    : 'Fallback templates (set GEMINI_API_KEY for Gemini Pro replies)';

async function start() {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🔮 Astro AI Backend running on http://localhost:${PORT}`);
      console.log(`   Response mode: ${aiMode}`);
      console.log(`   API (mobile + web): http://localhost:${PORT}/api`);
      if (fs.existsSync(clientIndex)) {
        console.log(`   Web UI: http://localhost:${PORT}/`);
      }
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
