# Deploy: Supabase + Render (API) + Vercel (frontend)

## Where secrets live (never commit real keys)

| Secret | Where to paste | Never put in |
|--------|----------------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Render → Environment, and `backend/.env` on your PC for local testing | GitHub, Vercel, frontend code |
| `SUPABASE_URL` | Same as above | — |
| `SUPABASE_ANON_KEY` | Not required for this app (API uses service role). Optional later for direct browser → Supabase | — |
| `PAYMENT_SECRET` | Render + local `backend/.env` | GitHub |
| `VITE_API_URL` | Vercel → Environment (public) | Only the **URL** is fine; it is not a password |

## 1) Supabase: create table

1. Open Supabase → **SQL Editor** → New query.
2. Paste contents of `supabase/schema.sql` → **Run**.
3. Confirm table `app_state` exists (**Table Editor**).

## 2) Migrate local JSON → Supabase (one time)

1. Copy `backend/.env.example` → `backend/.env`.
2. Fill `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from Supabase → **Settings → API**).
3. From folder `backend` run:

```bash
npm run migrate
```

4. Optional: verify in Supabase **Table Editor** → `app_state` → row `id=1` has `payload` JSON.

## 3) GitHub

1. Ensure root `.gitignore` ignores `backend/.env`, `backend/database.json`, `sessions`, `uploads`.
2. Commit and push (no `.env` in repo).

## 4) Render: deploy Node API

1. **New** → **Web Service** → connect the GitHub repo.
2. **Root Directory**: `backend`
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. **Environment** (same names as `backend/.env.example`):

   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PAYMENT_SECRET` (use a long random string; keep it stable across deploys or encrypted payment fields won’t decrypt)
   - `NODE_VERSION` = `20` (optional, recommended)

6. Deploy. Copy the URL (e.g. `https://Nexora-api.onrender.com`).

**API base for the frontend:** `https://YOUR-RENDER-URL` — routes are under `/api/...`, so:

`VITE_API_URL=https://YOUR-RENDER-URL/api`

## 5) Vercel: deploy frontend only

1. **New Project** → import the same GitHub repo.
2. **Root Directory**: `frontend`
3. **Framework**: Vite.
4. **Environment Variables**:

   - `VITE_API_URL` = `https://YOUR-RENDER-URL/api`

5. Deploy. Open the `.vercel.app` URL.

## 6) Local dev

- `backend/.env` with or without Supabase (without = uses `database.json`).
- `frontend/.env` with `VITE_API_URL=http://localhost:5000/api`.

## WhatsApp note (hybrid)

This repo runs Baileys **inside the same Node process** as the API. If the API is on **Render free tier**, the instance may **sleep**, and WhatsApp sessions are harder to keep stable. For gyms running a **local** worker later, you would split that into a separate process; until then, treat **production WhatsApp** as “works when the API host stays awake.”
