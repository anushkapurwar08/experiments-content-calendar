# Setup & Deploy — Experiments Calendar

This is a shared experiments calendar. Anyone with the link can view **and** edit,
with changes syncing live. It's a small React app (hosted free on Vercel) backed by
a free Supabase database.

There are three one-time steps: **1) create the database**, **2) run it locally**,
**3) deploy to Vercel**. Total time ~15 minutes. No coding required.

---

## Step 1 — Create the Supabase database (~5 min)

Supabase is the shared database that makes collaboration work. Without it, entries
would only live in your own browser and nobody else would see them.

1. Go to **https://supabase.com** and sign up (free — use GitHub or email).
2. Click **New project**.
   - **Name:** `experiments-calendar` (anything works)
   - **Database password:** generate one and save it somewhere (you won't need it
     day-to-day, but keep it).
   - **Region:** pick the one closest to you/your team.
   - Click **Create new project** and wait ~2 min for it to spin up.
3. In the left sidebar, open the **SQL Editor** → **New query**.
4. Open the file `supabase-schema.sql` from this project, copy **all** of it, paste
   it into the editor, and click **Run**. You should see "Success. No rows returned."
   This creates the `experiments` table and turns on live sync.
5. Now grab your keys: left sidebar → **Project Settings** (gear icon) → **API**.
   Copy these two values:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key (a long string under "Project API keys")

   > The **anon** key is meant to be used in a browser — it's safe to ship. Do NOT
   > use the `service_role` key; that one is secret.

---

## Step 2 — Run it locally (~3 min)

1. In this project folder, copy the example env file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and paste in the two values from Step 1:
   ```
   VITE_SUPABASE_URL=https://abcd1234.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-long-anon-key...
   ```
3. Install and start:
   ```bash
   npm install
   npm run dev
   ```
4. Open the URL it prints (usually http://localhost:5173). You should see the
   calendar open on **July 2026**. Click any day to add your first experiment.

If you instead see a "needs a database" screen, the `.env` values are missing or the
dev server needs a restart (env vars are only read at startup).

---

## Step 3 — Deploy to Vercel (~5 min)

1. Push this project to a GitHub repo (or use the Vercel CLI — see below).
2. Go to **https://vercel.com**, sign in with GitHub, click **Add New… → Project**,
   and import your repo.
3. Vercel auto-detects Vite. Leave the build settings as-is:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Before deploying, add your two environment variables (this is the important part —
   Vercel doesn't see your local `.env`):
   - Expand **Environment Variables** and add:
     - `VITE_SUPABASE_URL` = your Project URL
     - `VITE_SUPABASE_ANON_KEY` = your anon public key
5. Click **Deploy**. In ~1 minute you'll get a live URL like
   `https://experiments-calendar.vercel.app`.
6. **Share that URL** with anyone. They can view and edit — no login needed.

> Changed env vars later? You must **redeploy** for them to take effect (Vercel →
> Deployments → ⋯ → Redeploy).

### Prefer the command line?
```bash
npm i -g vercel
vercel            # follow prompts to link/create the project
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod     # deploy to your live URL
```

---

## How sharing works (and the trade-off)

- Everyone opens the **same Vercel URL** and sees the **same data** (it lives in
  Supabase, not in any one browser).
- Edits sync **live** — if a teammate adds an experiment, it appears on your calendar
  within a second, no refresh needed.
- Because there's **no login**, anyone with the link can add, edit, or delete. That's
  the intended trade-off for a frictionless internal tool. Don't put anything
  sensitive in it, and share the link only with people you trust.
- Want logins later (per-person accounts, who-changed-what)? Supabase supports it —
  you'd add Supabase Auth and tighten the row-level-security policies in
  `supabase-schema.sql`. Ask and it can be added.

---

## Everyday use

- **Add:** click any day, or the **+ New experiment** button.
- **Edit / delete:** click an experiment pill.
- **Date ranges:** set an end date after the start date; the experiment shows as a
  bar spanning those days.
- **Status colors:** Planned (indigo), Running (blue), Done (green), Blocked (red).
- **Navigate:** use ‹ › to change months, or **Today** to jump to the current month.
