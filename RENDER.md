# Render notes (mobile-safe)

This repo serves:
- `/api/*` — same API used by the mobile app (unchanged)
- `/` — React web UI (built from `frontend/` into `client/` at deploy time)

## Render settings

| Setting | Value |
|---------|--------|
| Root Directory | *(leave empty / repo root)* |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |

Keep existing env vars (`GEMINI_API_KEY`, `MONGODB_URI`, JWT secrets, etc.).

Mobile continues to use: `https://new-app-7cvj.onrender.com/api`
