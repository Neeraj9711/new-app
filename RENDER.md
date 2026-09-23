# Render deploy (mobile-safe)

Same service URL serves:

| Path | What |
|------|------|
| `/` | React web app (Astro AI UI) |
| `/api/*` | API for **mobile + web** (unchanged) |

## Why you only saw the backend

Render ran **Build Command = `npm install`** only, so the React app was never built into `client/`.

## Fix (do this in Render Dashboard)

**Settings → Build & Deploy:**

| Setting | Value |
|---------|--------|
| Build Command | `npm install` |
| Start Command | `npm start` |

`postinstall` now builds the frontend automatically during `npm install` (uses `--include=dev` so Vite is available).

Or explicitly:

| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |

Then **Manual Deploy → Clear build cache & deploy**.

## After deploy

- Web UI: `https://YOUR-SERVICE.onrender.com/`
- Mobile API (same as before): `https://YOUR-SERVICE.onrender.com/api`

Check deploy logs for: `Web UI: http://localhost:.../`
If that line is missing, the client build failed — open the build log for Vite errors.
