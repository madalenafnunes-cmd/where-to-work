// Nominatim client — respects the public instance's 1 req/sec policy.
// Docs: https://operations.osmfoundation.org/policies/nominatim/

const BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT_NOTE = "where-to-work/0.1 (https://github.com/)";
// The browser fetch can't set User-Agent, but Nominatim also accepts
// a descriptive Referer. We send one via a custom header-friendly param.

let lastCall = 0;
const MIN_GAP_MS = 1100;

async function throttle() {
  const wait = Math.max(0, lastCall + MIN_GAP_MS - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

export type NominatimSearchResult = {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
};

export async function searchPlace(
  query: string,
  signal?: AbortSignal,
): Promise<NominatimSearchResult[]> {
  if (!query.trim()) return [];
  await throttle();
  const url = new URL(`${BASE}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "0");
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "X-App": USER_AGENT_NOTE },
    signal,
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  return (await res.json()) as NominatimSearchResult[];
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  await throttle();
  const url = new URL(`${BASE}/reverse`);
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lng.toString());
  url.searchParams.set("format", "json");
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "X-App": USER_AGENT_NOTE },
    signal,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { display_name?: string };
  return data.display_name ?? null;
}
