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

// ——— Web UI only (does not handle /api/*) ———
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get(/^(?!\/api).*/, (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.sendFile(clientIndex, (err) => {
      if (err) next();
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
