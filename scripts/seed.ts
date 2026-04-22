/**
 * Seed script — demo Lisbon content.
 *
 * Pulls ~8 real cafes near central Lisbon from Overpass, upserts them into
 * `places`, and writes a handful of fake ratings per cafe so the color-coded
 * pins have something to show when you open the app from Lisbon.
 *
 * Usage:   npm run seed
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local.
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

loadEnv({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Central Lisbon bbox — Baixa / Chiado / Bairro Alto area.
const BBOX = { south: 38.7067, west: -9.1555, north: 38.7272, east: -9.1300 };

const OVERPASS = "https://overpass-api.de/api/interpreter";
const QUERY = `
[out:json][timeout:25];
(
  node["amenity"="cafe"]["name"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
);
out center tags;
`.trim();

type El = { type: string; id: number; lat: number; lon: number; tags: Record<string, string> };

function jitter(base: number, spread = 0.7): number {
  const v = base + (Math.random() - 0.5) * 2 * spread;
  return Math.max(1, Math.min(5, Math.round(v * 2) / 2));
}

async function main() {
  console.log("Fetching Lisbon cafes from Overpass…");
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(QUERY),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const data = (await res.json()) as { elements: El[] };

  const picks = data.elements.filter((e) => e.tags?.name).slice(0, 8);
  if (picks.length === 0) {
    console.error("Overpass returned no named cafes. Try again in a minute.");
    process.exit(1);
  }

  console.log(`Seeding ${picks.length} places:`);
  for (const el of picks) {
    const osm_id = `${el.type}/${el.id}`;
    const { data: place, error: pe } = await sb
      .from("places")
      .upsert(
        {
          osm_id,
          name: el.tags.name,
          address: el.tags["addr:street"] ?? null,
          lat: el.lat,
          lng: el.lon,
        },
        { onConflict: "osm_id" },
      )
      .select("id")
      .single();
    if (pe || !place) {
      console.error(`  ✗ ${osm_id}: ${pe?.message}`);
      continue;
    }
    console.log(`  ✓ ${el.tags.name} (${osm_id})`);

    // 3–6 fake contributors per cafe, biased slightly good.
    const n = 3 + Math.floor(Math.random() * 4);
    const rows = Array.from({ length: n }, () => ({
      place_id: place.id,
      contributor_id: "seed-" + randomUUID(),
      noise:           jitter(3.8),
      plugs:           jitter(3.5),
      wifi:            jitter(4.0),
      laptop_friendly: jitter(3.7),
      price:           jitter(3.5),
      food:            jitter(3.8),
      coffee:          jitter(4.2),
      note: null,
    }));
    const { error: re } = await sb.from("ratings").upsert(rows, { onConflict: "place_id,contributor_id" });
    if (re) console.error(`    ratings error: ${re.message}`);
  }

  console.log("\nDone. Open the app, zoom to Lisbon, and you should see colored pins.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
