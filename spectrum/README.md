# Spectrum Dashboard

Vite + React + react-router-dom + Recharts, backed by Supabase auth and RLS.
Deploys via GitHub → Railway.

## Local dev

```bash
cp .env.example .env    # then paste your Supabase URL + anon key
npm install
npm run dev             # http://localhost:5173
```

## Deploy on Railway

1. Push this repo to GitHub.
2. On Railway → **New Project → Deploy from GitHub repo** → pick this repo.
3. In the service → **Variables**, set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. In **Settings → Networking**, click **Generate Domain** (and later attach `myspectrumdashboard.com`).

Railway detects the `Dockerfile` and builds automatically. Every push to `main` redeploys.

## Env vars — what's safe

`VITE_*` vars are baked into the browser bundle. That's fine for the Supabase URL
and the anon/publishable key — they're **designed** to be public; Row-Level Security
in Postgres is what actually protects the data.

**Never** put the Supabase `service_role` key here, ever.

## Routes

- `/` — Executive dashboard (approved users; admins always allowed)
- `/login` — Sign in
- `/request-access` — Sign up; lands as `pending`
- `/admin` — Access administration (admins only)
