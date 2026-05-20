# 🏪 DukanBook — Deployment Guide

Shop accounting app for Indian small businesses.
**Stack:** React + Vite · Supabase (auth + DB) · Vercel (hosting)
**Cost:** ₹0 — fully free tier

---

## Step 1 — Set up Supabase (5 mins)

1. Go to **https://supabase.com** → Sign up (free)
2. Click **New Project** → give it a name (e.g. `dukanbook`) → set a DB password → Create
3. Wait ~2 minutes for the project to spin up
4. Go to **SQL Editor** (left sidebar) → **New Query**
5. Open `supabase-schema.sql` from this folder, paste the entire contents, click **Run**
6. Go to **Settings → API** — copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon/public** key

---

## Step 2 — Set up the project locally

```bash
# Clone or download this project folder, then:
cd dukanbook
cp .env.example .env
```

Open `.env` and fill in:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

```bash
npm install
npm run dev
# Open http://localhost:5173
```

Test it locally — sign up, add sales, add expenses, export PDF.

---

## Step 3 — Push to GitHub (3 mins)

1. Go to **https://github.com** → New repository → name it `dukanbook` → Create
2. In your terminal:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dukanbook.git
git push -u origin main
```

---

## Step 4 — Deploy on Vercel (2 mins)

1. Go to **https://vercel.com** → Sign up with GitHub
2. Click **Add New Project** → Import your `dukanbook` repo
3. Framework: **Vite** (auto-detected)
4. Click **Environment Variables** → add:
   - `VITE_SUPABASE_URL` → your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` → your anon key
5. Click **Deploy**

✅ Your app is live at `https://dukanbook.vercel.app` (or similar)

Every time you push to GitHub → Vercel auto-deploys.

---

## Step 5 — Configure Supabase Auth (important!)

1. In Supabase → **Authentication → URL Configuration**
2. Set **Site URL** to your Vercel URL: `https://dukanbook.vercel.app`
3. Add to **Redirect URLs**: `https://dukanbook.vercel.app/**`

---

## Optional: Custom Domain

In Vercel → your project → **Settings → Domains** → add your domain.
Buy `.in` domains from GoDaddy/Namecheap for ~₹800/year.

---

## Features

- ✅ Email + password login (no OTP, no SMS cost)
- ✅ Each shop's data is private (row-level security)
- ✅ Daily / weekly / monthly reports
- ✅ PDF export with full transaction table
- ✅ Cash + UPI sales tracking
- ✅ Free-text expense entries
- ✅ Cloud sync — works across devices
- ✅ Mobile-first design

---

## Free Tier Limits

| Service | Free Limit |
|---------|-----------|
| Supabase DB | 500 MB |
| Supabase Auth | Unlimited users |
| Vercel hosting | Unlimited deploys |
| Vercel bandwidth | 100 GB/month |

More than enough for hundreds of shops.
