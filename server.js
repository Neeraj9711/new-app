// Must be first so env vars are loaded before other modules read them at import time
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from './db/connect.js';
import authRoutes from './routes/auth.js';
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

// Existing static pages (privacy, etc.) — unchanged for mobile/legal links
app.use(express.static(publicDir));

// ——— Mobile + web API (unchanged paths) ———
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Astro AI', version: '1.0.0' });
});

app.get('/privacy', (_req, res) => {
  res.sendFile(path.join(publicDir, 'privacy.html'));
});

app.use('/api/auth', authRoutes);
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
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(seo.title)}</title>`);
  if (out.includes('name="description"')) {
    out = out.replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    );
  }
  out = out.replace(/<link rel="canonical"[^>]*>/g, '');
  out = out.replace(/<meta property="og:[^"]+" content="[^"]*"\s*\/?>/g, '');
  const extra = `
    <link rel="canonical" href="${escapeHtml(seo.canonical)}" />
    <meta property="og:title" content="${escapeHtml(seo.title)}" />
    <meta property="og:description" content="${escapeHtml(seo.description)}" />
    <meta property="og:url" content="${escapeHtml(seo.canonical)}" />
    <meta property="og:type" content="website" />
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
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
  );
});

app.get('/sitemap.xml', (_req, res) => {
  const lastmod = new Date().toISOString().split('T')[0];
  const urls = sitemapPaths().map((path) => {
    const loc = path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
    const priority = path === '/' ? '1.0' : path.includes('rashifal') || path === '/kundli' || path === '/panchang' ? '0.9' : '0.7';
    return `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>${priority}</priority></url>`;
  }).join('');
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
  );
});

// ——— Web UI only (does not handle /api/*) ———
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir, { index: false }));
  app.get(/^(?!\/api).*/, (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    fs.readFile(clientIndex, 'utf8', (err, html) => {
      if (err) return next(err);
      res.type('html').send(injectSeoHtml(html, req.path));
    });
  });
}

const aiMode = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'
  ? `Gemini (${process.env.GEMINI_MODEL || 'gemini-flash-latest'})`
  : 'Fallback templates (set GEMINI_API_KEY in backend/.env for real AI)';

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
