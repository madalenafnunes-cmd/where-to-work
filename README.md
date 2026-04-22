# Where to Work

A mobile-first web app that helps remote workers find nearby cafes and coworking
spots rated specifically on how good they are for getting work done.

- **Worldwide** from day one (OpenStreetMap coverage).
- **Free stack, no credit card**: Next.js + Supabase free tier + Leaflet + OSM + Overpass + Nominatim.
- **No login**: anonymous contributor IDs in `localStorage`.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind v4
- Supabase (Postgres + RLS) for anonymous reads/writes
- Leaflet / react-leaflet with OpenStreetMap tiles
- Overpass API for cafe/coworking venue pins
- Nominatim for address search + reverse geocoding
- `opening_hours.js` for "open now" parsing

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

1. Sign in to [supabase.com](https://supabase.com) and create a new project (free tier is fine).
2. Open the **SQL Editor** and run the migration at
   [`supabase/migrations/0001_schema.sql`](supabase/migrations/0001_schema.sql).
   You should see _"Success. No rows returned"_.
3. Go to **Project Settings → API** and copy:
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY` (seed only — never ship this to the browser)

### 3. Environment variables

Copy the example file and fill in the values:

```bash
cp .env.local.example .env.local
```

Required at runtime:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Required for `npm run seed` only:

- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Seed the database (optional but recommended for demo)

Populates ~8 real Lisbon cafes with fake ratings so the map has something colorful
to show:

```bash
npm run seed
```

The script pulls the cafes live from Overpass, upserts them into `places`, and
writes 3–6 pseudo-random ratings per cafe.

### 5. Run locally

```bash
npm run dev
```

Open the URL it prints (default: http://localhost:3000).

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel.
3. In **Project Settings → Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - _(do **not** add `SUPABASE_SERVICE_ROLE_KEY`; it's only for local seeding)_
4. Deploy.

## Project layout

```
src/
  app/            page, layout, global styles
  components/     Map, PlaceSheet, RatingForm, StarRating, SearchBox
  hooks/          useGeolocation
  lib/            supabase, overpass, nominatim, hours, contributor, types
supabase/
  migrations/     0001_schema.sql
scripts/
  seed.ts         Lisbon demo content
```

## Fair-use notes

Overpass and Nominatim are community-run free services. This app:

- debounces viewport searches by 500ms and caches results in the session
- caps bbox area and shows a "zoom in" nudge instead of querying huge areas
- throttles Nominatim client-side to ≤1 req/sec
- always includes the OSM attribution in the map corner

## Out of scope for v1

Accounts, photos, favorites, filters, personalized weighting, moderation, push,
native apps, i18n. See the project brief for the rationale.
