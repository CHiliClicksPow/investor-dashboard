# Pitch Our Way — Investor Matching Platform

## What works right now (no API key needed)
- **Login** (`/login`) restricted to `investment@pitchourway.com` — enforced at
  the database level, not just in the app.
- **Import Investors** (`/import-investors`) — upload your Excel workbook once;
  it parses all sheets in your browser, deduplicates, and loads everything
  into the database.
- **New Deal** (`/deals/new`) — enter a company's sector, stage, geography,
  funding ask and notes; optionally attach a pitch deck / financial model
  (stored, not yet auto-read).
- **Matching** (`/deals/[id]`) — click "Find matching investors" and it scores
  every investor against the deal on sector, stage, geography and ticket
  size, then groups them into Strong / Good / Possible Match. This runs
  entirely in the database — free, instant, no external API.

## Coming later (needs a free Gemini API key, added when you're ready)
- Reading the actual pitch deck / financial model content to auto-fill deal
  details instead of typing them in
- Deeper thesis-based matching (reading each investor's description /
  investment philosophy, not just structured fields)

Nothing needs to change in what's already built to add this — it plugs in
as an extra step next to the matching that already works.

## Running it yourself

1. Install [Node.js](https://nodejs.org) (v18 or newer).
2. In this folder: `npm install`
3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase dashboard → Settings → API → "anon public"
   - `SUPABASE_SERVICE_ROLE_KEY` — same page → "service_role" (keep secret)
   - Leave `ANTHROPIC_API_KEY` blank for now — not needed yet
4. Test locally: `npm run dev`, then open http://localhost:3000
5. To put it online: create a free [Vercel](https://vercel.com) account,
   "Import Project" with this folder (or a connected GitHub repo), paste in
   the same environment variables under Project Settings → Environment
   Variables, and deploy.

## First-time setup once it's live
1. Open the site → "Create the account" → sign in with
   `investment@pitchourway.com` and a password of your choice.
2. Go to **Import Investors** and upload your Excel file (one-time).
3. Go to **New Deal**, fill in a deal, and click **Find matching investors**.
