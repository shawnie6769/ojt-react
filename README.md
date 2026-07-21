# OJT Tracker (React + Tailwind + Supabase)

Track your OJT hours. Built with Next.js App Router, Tailwind CSS, Supabase, deployed on Vercel.

---

## 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and open your project.
2. Open **SQL Editor → New query**, paste the contents of `supabase-schema.sql`, and run it.
3. Go to **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://abcxyz.supabase.co`)
   - **anon / public** key

---

## 2. Run locally

```bash
# Copy env file and fill in your credentials
cp .env.local.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

npm install
npm run dev
```

Open http://localhost:3000 — works on phone too if your laptop and phone share Wi-Fi.

---

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo.
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Hit **Deploy**. Vercel auto-detects Next.js — no config needed.

Your app will be live at `https://your-project.vercel.app` — accessible from your phone anywhere.

---

## Project structure

```
app/
  layout.tsx          root layout + bottom nav
  page.tsx            Dashboard (hero stats + this week)
  history/page.tsx    All sessions, paginated
  settings/page.tsx   Required hours + start date
  globals.css         Tailwind base + shared component classes
components/
  Nav.tsx             Bottom tab navigation
  TapeProgress.tsx    Punched-hole-tape progress bar
  SessionCard.tsx     Single session row (inline edit/delete)
  SessionForm.tsx     Add / edit form
lib/
  supabase.ts         Supabase client + shared types
  hours.ts            Calculation helpers (sessionHours, totals, week filter)
supabase-schema.sql   Run once in Supabase SQL Editor
```
