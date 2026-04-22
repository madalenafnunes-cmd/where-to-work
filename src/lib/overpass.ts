import type { BBox, OsmPlace, OsmElementType } from "./types";

// Public Overpass mirrors — we try them in order until one answers with 200.
// The main overpass-api.de sometimes returns 406 from browser origins; the
// Kumi Systems mirror is more permissive.
const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

// Session-scoped cache: key is a rounded bbox string, value is the result.
// Rounding to 3 decimals (~110m) so small pan jitter hits the cache.
const cache = new Map<string, OsmPlace[]>();

function bboxKey(b: BBox): string {
  const r = (n: number) => n.toFixed(3);
  return `${r(b.south)},${r(b.west)},${r(b.north)},${r(b.east)}`;
}

// Area in square degrees — rough guard against massive queries that would
// hammer Overpass. ~0.25 sq° is roughly a small metro area at mid-latitudes.
export function bboxAreaDeg2(b: BBox): number {
  return Math.max(0, (b.north - b.south) * (b.east - b.west));
}

export const MAX_QUERY_AREA_DEG2 = 0.25;

function buildQuery(b: BBox): string {
  const bbox = `${b.south},${b.west},${b.north},${b.east}`;
  return `
[out:json][timeout:25];
(
  node["amenity"="cafe"](${bbox});
  way["amenity"="cafe"](${bbox});
  node["amenity"="coworking_space"](${bbox});
  way["amenity"="coworking_space"](${bbox});
  node["amenity"="restaurant"]["cuisine"="coffee_shop"](${bbox});
  way["amenity"="restaurant"]["cuisine"="coffee_shop"](${bbox});
);
out center tags;
  `.trim();
}

type OverpassElement = {
  type: OsmElementType;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassElementWithLocation = OverpassElement & {
  resolvedLat: number;
  resolvedLon: number;
};

export async function fetchVenuesInBBox(
  bbox: BBox,
  signal?: AbortSignal,
): Promise<OsmPlace[]> {
  const key = bboxKey(bbox);
  const cached = cache.get(key);
  if (cached) return cached;

  if (bboxAreaDeg2(bbox) > MAX_QUERY_AREA_DEG2) {
    throw new Error("ZOOM_IN");
  }

  // GET is more widely accepted than POST across Overpass mirrors.
  const querystring = "?data=" + encodeURIComponent(buildQuery(bbox));
  let res: Response | null = null;
  let lastErr: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const r = await fetch(endpoint + querystring, { method: "GET", signal });
      if (r.ok) {
        res = r;
        break;
      }
      lastErr = new Error(`Overpass HTTP ${r.status} from ${endpoint}`);
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      lastErr = err;
    }
  }

  if (!res) {
    throw (lastErr as Error) ?? new Error("Overpass unreachable");
  }

  const data = (await res.json()) as { elements?: OverpassElement[] };
  const elements = data.elements ?? [];

  const places: OsmPlace[] = elements
    .map((el): OverpassElementWithLocation | null => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (lat == null || lon == null) return null;
      return { ...el, resolvedLat: lat, resolvedLon: lon };
    })
    .filter((el): el is OverpassElementWithLocation => el !== null)
    .map((el) => ({
      osmId: `${el.type}/${el.id}`,
      name: el.tags?.name ?? "Unnamed cafe",
      lat: el.resolvedLat,
      lng: el.resolvedLon,
      tags: el.tags ?? {},
    }));

  cache.set(key, places);
  return places;
}
