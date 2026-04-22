import type { BBox, OsmPlace, OsmElementType } from "./types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

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

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(buildQuery(bbox)),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Overpass HTTP ${res.status}`);
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
