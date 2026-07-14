# Experiments Calendar

A spacious, shareable month calendar for planning and tracking experiments. Opens on
**July 2026**. Anyone with the link can view and edit; changes sync live.

Built with Vite + React + TypeScript, backed by Supabase, deployed on Vercel.

## Features

- Roomy month grid — you can actually read what's scheduled each day.
- Add / edit / delete experiments with title, date range, status, owner, and notes.
- Status colors: Planned, Running, Done, Blocked. Multi-day experiments show as a bar.
- Live sync across everyone viewing the same URL (Supabase realtime).
- No login — anyone with the link can edit (intended trade-off for a shared tool).

## Getting started

**Full step-by-step instructions (database + local + deploy) are in [`SETUP.md`](./SETUP.md).**

Quick version:

```bash
# 1. Create a free Supabase project, then run supabase-schema.sql in its SQL editor.
# 2. Add your keys:
cp .env.example .env        # then paste your Supabase URL + anon key
# 3. Run:
npm install
npm run dev
```

## Deploy

Push to GitHub, import into Vercel, add the two `VITE_SUPABASE_*` environment
variables, and deploy. Details in [`SETUP.md`](./SETUP.md).

## Scripts

- `npm run dev` — start the local dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
