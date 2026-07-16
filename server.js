// Must be first so env vars are loaded before other modules read them at import time
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db/connect.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import kundliRoutes from './routes/kundli.js';
import panchangRoutes from './routes/panchang.js';
import horoscopeRoutes from './routes/horoscope.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Astro AI', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/kundli', kundliRoutes);
app.use('/api/panchang', panchangRoutes);
app.use('/api/horoscope', horoscopeRoutes);

const aiMode = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'
  ? `Gemini (${process.env.GEMINI_MODEL || 'gemini-flash-latest'})`
  : 'Fallback templates (set GEMINI_API_KEY in backend/.env for real AI)';

async function start() {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🔮 Astro AI Backend running on http://localhost:${PORT}`);
      console.log(`   Response mode: ${aiMode}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
