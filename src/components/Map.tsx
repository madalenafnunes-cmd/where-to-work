"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

import { fetchVenuesInBBox, MAX_QUERY_AREA_DEG2, bboxAreaDeg2 } from "@/lib/overpass";
import { fetchCustomPlacesInBBox } from "@/lib/customPlaces";
import { getSupabase, type RatingSummary } from "@/lib/supabase";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { BBox, OsmPlace } from "@/lib/types";
import PlaceSheet from "./PlaceSheet";
import SearchBox from "./SearchBox";
import FavoritesPanel from "./FavoritesPanel";
import AddPlaceSheet from "./AddPlaceSheet";
import { useFavorites } from "@/hooks/useFavorites";
import type { Favorite } from "@/lib/favorites";

const DEFAULT_CENTER: [number, number] = [38.7223, -9.1393]; // Lisbon, just as a fallback first-paint
const DEBOUNCE_MS = 500;

function toBBox(b: ReturnType<ReturnType<typeof useMap>["getBounds"]>): BBox {
  return {
    south: b.getSouth(),
    west: b.getWest(),
    north: b.getNorth(),
    east: b.getEast(),
  };
}

function pinColor(overall: number | null | undefined): string {
  if (overall == null) return "#9ca3af";
  if (overall >= 4) return "#10b981";
  if (overall >= 3) return "#f59e0b";
  return "#ef4444";
}

type Status = "idle" | "loading" | "error" | "too-wide";

function ViewportLoader({
  onPlaces,
  onCustomPlaces,
  onStatus,
  onDirty,
  searchToken,
}: {
  onPlaces: (p: OsmPlace[]) => void;
  onCustomPlaces: (p: OsmPlace[]) => void;
  onStatus: (s: Status) => void;
  onDirty: (d: boolean) => void;
  searchToken: number;
}) {
  const map = useMap();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const firstLoad = useRef(false);

  const run = useCallback(async () => {
    const bbox = toBBox(map.getBounds());
    if (bboxAreaDeg2(bbox) > MAX_QUERY_AREA_DEG2) {
      onStatus("too-wide");
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    onStatus("loading");
    // Custom places come from Supabase and are cheap/fast; kick off in parallel.
    fetchCustomPlacesInBBox(bbox).then((list) => {
      if (!ac.signal.aborted) onCustomPlaces(list);
    });
    try {
      const places = await fetchVenuesInBBox(bbox, ac.signal);
      if (ac.signal.aborted) return;
      onPlaces(places);
      onStatus("idle");
      onDirty(false);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      onStatus("error");
    }
  }, [map, onPlaces, onCustomPlaces, onStatus, onDirty]);

  useEffect(() => {
    if (firstLoad.current) return;
    firstLoad.current = true;
    const t = setTimeout(run, 50);
    return () => clearTimeout(t);
  }, [run]);

  useEffect(() => {
    if (searchToken === 0) return;
    run();
  }, [searchToken, run]);

  useMapEvents({
    moveend: () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onDirty(true), DEBOUNCE_MS);
    },
  });

  return null;
}

function ClickCapture({
  placing,
  onPick,
}: {
  placing: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (placing) onPick(e.latlng.lat, e.latlng.lng);
    },
    contextmenu(e) {
      // Right-click on desktop, long-press on some mobile browsers.
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function ExternalCenterController({ target }: { target: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], target.zoom ?? 15, { duration: 0.8 });
  }, [target, map]);
  return null;
}

function RecenterButton({ target, onClick }: { target: { lat: number; lng: number } | null; onClick: () => void }) {
  if (!target) return null;
  return (
    <button
      onClick={onClick}
      className="absolute bottom-6 right-4 z-[1000] flex h-11 w-11 items-center justify-center rounded-full shadow-soft border transition-colors hover:bg-[var(--bg)]"
      style={{ background: "white", color: "var(--ink)", borderColor: "var(--line)" }}
      aria-label="Recenter on my location"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="22" y2="12" />
      </svg>
    </button>
  );
}

export default function Map() {
  const geo = useGeolocation();

  const [places, setPlaces] = useState<OsmPlace[]>([]);
  const [customPlaces, setCustomPlaces] = useState<OsmPlace[]>([]);
  const [placing, setPlacing] = useState(false);
  const [pendingLoc, setPendingLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [dirty, setDirty] = useState(false);
  const [searchToken, setSearchToken] = useState(0);

  const [summaries, setSummaries] = useState<Record<string, RatingSummary>>({});
  const [summaryToken, setSummaryToken] = useState(0);

  const [selectedPlace, setSelectedPlace] = useState<OsmPlace | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [favPanelOpen, setFavPanelOpen] = useState(false);
  const favs = useFavorites();

  const userLoc = geo.status === "granted" ? { lat: geo.lat, lng: geo.lng } : null;

  // Kick off fly-to user's real location as soon as we get it.
  useEffect(() => {
    if (geo.status === "granted") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync map center to geolocation result
      setFlyTarget({ lat: geo.lat, lng: geo.lng, zoom: 15 });
    }
  }, [geo]);

  // Fetch rating summaries for currently loaded places.
  useEffect(() => {
    const sb = getSupabase();
    const allPlaces = [...places, ...customPlaces];
    if (!sb || allPlaces.length === 0) return;
    const ids = allPlaces.map((p) => p.osmId);
    let aborted = false;
    (async () => {
      const { data, error } = await sb
        .from("place_ratings_summary")
        .select("*")
        .in("osm_id", ids);
      if (aborted || error || !data) return;
      const map: Record<string, RatingSummary> = {};
      for (const row of data as RatingSummary[]) {
        map[row.osm_id] = row;
      }
      setSummaries((prev) => ({ ...prev, ...map }));
    })();
    return () => {
      aborted = true;
    };
  }, [places, customPlaces, summaryToken]);

  const initialBounds: LatLngBoundsExpression = useMemo(
    () => [
      [DEFAULT_CENTER[0] - 0.03, DEFAULT_CENTER[1] - 0.03],
      [DEFAULT_CENTER[0] + 0.03, DEFAULT_CENTER[1] + 0.03],
    ],
    [],
  );

  const selectedSummary = selectedPlace ? (summaries[selectedPlace.osmId] ?? null) : null;

  // Make sure we have a summary for the selected place even if it isn't in the
  // current viewport's Overpass results (e.g. opened from the Favorites panel).
  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !selectedPlace) return;
    if (summaries[selectedPlace.osmId]) return;
    let aborted = false;
    (async () => {
      const { data } = await sb
        .from("place_ratings_summary")
        .select("*")
        .eq("osm_id", selectedPlace.osmId)
        .maybeSingle();
      if (aborted || !data) return;
      setSummaries((prev) => ({ ...prev, [selectedPlace.osmId]: data as RatingSummary }));
    })();
    return () => { aborted = true; };
  }, [selectedPlace, summaries]);

  function pickFavorite(f: Favorite) {
    setFlyTarget({ lat: f.lat, lng: f.lng, zoom: 16 });
    setSelectedPlace({ osmId: f.osmId, name: f.name, lat: f.lat, lng: f.lng, tags: {} });
    setFavPanelOpen(false);
  }

  return (
    <div className="relative h-full w-full" style={{ touchAction: "manipulation" }}>
      <MapContainer bounds={initialBounds} scrollWheelZoom touchZoom={true} tap={true} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <ViewportLoader
          onPlaces={setPlaces}
          onCustomPlaces={setCustomPlaces}
          onStatus={setStatus}
          onDirty={setDirty}
          searchToken={searchToken}
        />

        <ClickCapture
          placing={placing}
          onPick={(lat, lng) => {
            setPlacing(false);
            setPendingLoc({ lat, lng });
          }}
        />

        <ExternalCenterController target={flyTarget} />

        {/* User location marker */}
        {userLoc && (
          <CircleMarker
            center={[userLoc.lat, userLoc.lng]}
            radius={7}
            pathOptions={{ color: "white", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }}
          />
        )}

        {places.map((p) => {
          const overall = summaries[p.osmId]?.overall_rating ?? null;
          return (
            <CircleMarker
              key={p.osmId}
              center={[p.lat, p.lng]}
              radius={9}
              pathOptions={{
                color: "white",
                weight: 2,
                fillColor: pinColor(overall),
                fillOpacity: 1,
              }}
              eventHandlers={{
                click: () => setSelectedPlace(p),
              }}
            >
              <Tooltip>{p.name}</Tooltip>
            </CircleMarker>
          );
        })}

        {/* Custom (user-added) places — distinctive periwinkle ring. */}
        {customPlaces.map((p) => {
          const overall = summaries[p.osmId]?.overall_rating ?? null;
          return (
            <CircleMarker
              key={p.osmId}
              center={[p.lat, p.lng]}
              radius={9}
              pathOptions={{
                color: "#6c63ff",
                weight: 3,
                fillColor: pinColor(overall),
                fillOpacity: 1,
              }}
              eventHandlers={{
                click: () => setSelectedPlace(p),
              }}
            >
              <Tooltip>{p.name} (added by a user)</Tooltip>
            </CircleMarker>
          );
        })}

        {/* Preview pin while placing. */}
        {pendingLoc && (
          <CircleMarker
            center={[pendingLoc.lat, pendingLoc.lng]}
            radius={11}
            pathOptions={{ color: "#6c63ff", weight: 3, fillColor: "#edebff", fillOpacity: 1 }}
          />
        )}

        <RecenterButton
          target={userLoc}
          onClick={() => userLoc && setFlyTarget({ ...userLoc, zoom: 15 })}
        />
      </MapContainer>

      {/* Top bar: search (when geo is denied/pending) + search-this-area */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex flex-col items-center gap-2 p-3">
        {(geo.status === "denied" || geo.status === "unavailable" || geo.status === "pending") && (
          <div className="pointer-events-auto w-full max-w-md">
            <SearchBox
              onPick={(lat, lng) => setFlyTarget({ lat, lng, zoom: 15 })}
            />
          </div>
        )}

        {dirty && status !== "too-wide" && (
          <button
            onClick={() => setSearchToken((t) => t + 1)}
            className="pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-soft border border-[var(--line)] hover:bg-[var(--bg)] transition-colors"
            style={{ background: "white", color: "var(--ink)" }}
          >
            {status === "loading" ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
                Searching…
              </>
            ) : (
              "Search this area"
            )}
          </button>
        )}

        {status === "too-wide" && (
          <div className="pointer-events-auto rounded-full px-4 py-2.5 text-sm font-medium shadow-soft border border-[var(--line)]" style={{ background: "white", color: "var(--ink)" }}>
            Zoom in to load cafes
          </div>
        )}
      </div>

      {status === "error" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[1000] flex justify-center">
          <div className="pointer-events-auto rounded-full px-4 py-2.5 text-sm font-medium shadow-soft" style={{ background: "rgba(255, 90, 95, 0.1)", color: "#ff5a5f" }}>
            Couldn&apos;t load cafes — try again in a moment
          </div>
        </div>
      )}

      {/* Empty state for no rated spots in view */}
      {status === "idle" && places.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[1000] flex justify-center px-4">
          <div className="pointer-events-auto max-w-sm rounded-2xl px-5 py-4 text-center text-sm shadow-soft" style={{ background: "var(--surface)", color: "var(--ink-muted)" }}>
            No cafes mapped here yet — zoom out, or help by adding one on{" "}
            <a href="https://www.openstreetmap.org" className="underline hover:no-underline transition" style={{ color: "var(--accent)" }} target="_blank" rel="noopener noreferrer">openstreetmap.org</a>.
          </div>
        </div>
      )}

      {/* Add-place FAB (bottom-right, above recenter) */}
      <button
        onClick={() => {
          setPlacing((v) => !v);
        }}
        aria-label={placing ? "Cancel adding place" : "Add a place"}
        aria-pressed={placing}
        className="absolute bottom-20 right-4 z-[1000] flex h-11 w-11 items-center justify-center rounded-full shadow-soft transition-colors"
        style={{
          background: placing ? "var(--accent)" : "white",
          color: placing ? "white" : "var(--ink)",
          border: placing ? "none" : "1px solid var(--line)",
        }}
      >
        {placing ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
      </button>

      {/* Placing-mode hint */}
      {placing && (
        <div className="pointer-events-none absolute inset-x-0 bottom-36 z-[1000] flex justify-center px-4">
          <div className="pointer-events-auto rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-soft" style={{ background: "var(--accent)" }}>
            Tap or long-press on the map to drop a pin
          </div>
        </div>
      )}

      {/* Favorites button (top-right) */}
      <button
        onClick={() => setFavPanelOpen(true)}
        className="absolute right-4 top-4 z-[1000] flex h-11 items-center gap-2 rounded-full bg-white px-3 text-sm font-medium shadow-soft border border-[var(--line)] hover:bg-[var(--bg)] transition-colors"
        style={{ color: "var(--ink)" }}
        aria-label="Open favorites"
      >
        <svg viewBox="0 0 24 24" className={`h-5 w-5 ${favs.length > 0 ? "text-[#ff5a5f]" : "text-[var(--ink-muted)]"}`} fill={favs.length > 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {favs.length > 0 && <span className="text-xs" style={{ color: "var(--ink-muted)" }}>{favs.length}</span>}
      </button>

      {selectedPlace && (
        <PlaceSheet
          place={selectedPlace}
          summary={selectedSummary}
          userLoc={userLoc}
          onClose={() => setSelectedPlace(null)}
          onRatingSaved={() => setSummaryToken((t) => t + 1)}
        />
      )}

      {favPanelOpen && (
        <FavoritesPanel
          userLoc={userLoc}
          onPick={pickFavorite}
          onClose={() => setFavPanelOpen(false)}
        />
      )}

      {pendingLoc && (
        <AddPlaceSheet
          lat={pendingLoc.lat}
          lng={pendingLoc.lng}
          onCancel={() => setPendingLoc(null)}
          onCreated={(place) => {
            setCustomPlaces((prev) => [...prev, place]);
            setPendingLoc(null);
            setSelectedPlace(place);
          }}
        />
      )}
    </div>
  );
}
