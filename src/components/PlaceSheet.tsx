"use client";

import { useEffect, useState } from "react";
import StarRating from "./StarRating";
import RatingForm from "./RatingForm";
import { getSupabase, type RatingInput, type RatingSummary } from "@/lib/supabase";
import { getContributorId } from "@/lib/contributor";
import { formatOpenStatus, parseOpenStatus } from "@/lib/hours";
import { toggleFavorite } from "@/lib/favorites";
import { useFavorites } from "@/hooks/useFavorites";
import type { OsmPlace } from "@/lib/types";

type Props = {
  place: OsmPlace;
  summary: RatingSummary | null;
  userLoc: { lat: number; lng: number } | null;
  onClose: () => void;
  onRatingSaved: () => void;
};

const CATS: Array<{ key: keyof RatingSummary; label: string; countKey: keyof RatingSummary }> = [
  { key: "avg_noise",           label: "Noise",           countKey: "noise_count" },
  { key: "avg_plugs",           label: "Plugs",           countKey: "plugs_count" },
  { key: "avg_wifi",            label: "Wi-Fi",           countKey: "wifi_count" },
  { key: "avg_laptop_friendly", label: "Laptop-friendly", countKey: "laptop_friendly_count" },
  { key: "avg_price",           label: "Price",           countKey: "price_count" },
  { key: "avg_food",            label: "Food",            countKey: "food_count" },
  { key: "avg_coffee",          label: "Coffee",          countKey: "coffee_count" },
];

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function directionsUrl(p: OsmPlace): string {
  // Desktop fallback — OSM routing. On mobile, `geo:` would be preferred, but
  // browsers ignore `geo:` on desktop, so we use OSM which works everywhere.
  return `https://www.openstreetmap.org/directions?to=${p.lat}%2C${p.lng}`;
}

export default function PlaceSheet({ place, summary, userLoc, onClose, onRatingSaved }: Props) {
  const [mode, setMode] = useState<"view" | "rate">("view");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const favs = useFavorites();
  const isFav = favs.some((f) => f.osmId === place.osmId);

  // Reset to view mode when switching between places.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form state when place prop changes
    setMode("view");
    setErrorMsg(null);
  }, [place.osmId]);

  const openStatus = parseOpenStatus(place.tags.opening_hours);
  const distance = userLoc ? haversineKm(userLoc, place) : null;
  const address = place.tags["addr:street"]
    ? [place.tags["addr:housenumber"], place.tags["addr:street"]].filter(Boolean).join(" ")
    : null;

  async function handleSubmit(r: RatingInput) {
    setSubmitting(true);
    setErrorMsg(null);
    const sb = getSupabase();
    if (!sb) {
      setErrorMsg("Supabase not configured. Check env vars.");
      setSubmitting(false);
      return;
    }

    try {
      // Ensure the place exists. The seed covers Lisbon demo rows, but any
      // new venue has to be inserted on first rating. Upsert by osm_id is safe
      // thanks to the unique constraint.
      const { data: placeRow, error: placeErr } = await sb
        .from("places")
        .upsert(
          {
            osm_id: place.osmId,
            name: place.name,
            address,
            lat: place.lat,
            lng: place.lng,
          },
          { onConflict: "osm_id" },
        )
        .select("id")
        .single();
      if (placeErr || !placeRow) throw placeErr ?? new Error("place upsert failed");

      const { error: ratingErr } = await sb.from("ratings").upsert(
        {
          place_id: placeRow.id,
          contributor_id: getContributorId(),
          ...r,
        },
        { onConflict: "place_id,contributor_id" },
      );
      if (ratingErr) throw ratingErr;

      onRatingSaved();
      setMode("view");
    } catch (e) {
      setErrorMsg((e as Error).message || "Couldn't save rating");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="
        fixed inset-x-0 bottom-0 z-[1100] max-h-[85dvh] rounded-t-2xl bg-white shadow-2xl ring-1 ring-black/5
        md:inset-y-0 md:left-0 md:right-auto md:bottom-auto md:top-0 md:h-full md:max-h-none md:w-[420px] md:rounded-none md:rounded-r-2xl
        flex flex-col
      "
      role="dialog"
      aria-label={place.name}
    >
      <div className="flex items-start justify-between gap-3 border-b" style={{ borderColor: "var(--line)" }} >
        <div className="flex-1 px-6 py-6">
          <h2 className="truncate type-h2" style={{ color: "var(--ink)" }}>{place.name}</h2>
          <div className="mt-2 type-meta">
            {[
              distance != null ? formatDistance(distance) : null,
              formatOpenStatus(openStatus),
              address,
            ].filter(Boolean).join(" · ")}
          </div>
        </div>

        <div className="flex items-center gap-1 px-6">
          <button
            onClick={() => toggleFavorite({ osmId: place.osmId, name: place.name, lat: place.lat, lng: place.lng })}
            aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={isFav}
            className="-m-2 rounded-full p-2 transition"
            style={{ color: isFav ? "#ff5a5f" : "var(--ink-muted)" }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-m-2 rounded-full p-2 transition"
            style={{ color: "var(--ink-muted)" }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {mode === "view" ? (
          <ViewBody summary={summary} />
        ) : (
          <RatingForm
            submitting={submitting}
            onCancel={() => setMode("view")}
            onSubmit={handleSubmit}
          />
        )}

        {errorMsg && (
          <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</div>
        )}
      </div>

      {mode === "view" && (
        <div className="flex gap-3 border-t px-6 py-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <a
            href={directionsUrl(place)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-full border px-4 py-3 text-center text-sm font-medium transition hover:bg-[var(--bg)]"
            style={{ borderColor: "var(--line)", color: "var(--ink)" }}
          >
            Directions
          </a>
          <button
            onClick={() => setMode("rate")}
            className="flex-[2] rounded-full px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition"
            style={{ background: "var(--ink)" }}
          >
            Rate this place
          </button>
        </div>
      )}
    </div>
  );
}

function ViewBody({ summary }: { summary: RatingSummary | null }) {
  const overall = summary?.overall_rating ?? null;
  const count = summary?.rating_count ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="type-label mb-3" style={{ color: "var(--ink-muted)" }}>OVERALL</div>
        <div className="flex items-center gap-4">
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-2xl font-800 text-white ${overallBadgeColor(overall)}`}>
            {overall != null ? overall.toFixed(1) : "–"}
          </div>
          <div>
            <StarRating value={overall ?? 0} readOnly size={20} />
            <div className="mt-1.5 type-meta">
              {count === 0 ? "No ratings yet" : `${count} rating${count === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="type-label mb-3" style={{ color: "var(--ink-muted)" }}>CATEGORIES</div>
        <div className="flex flex-col gap-2">
          {CATS.map((c) => {
            const val = (summary?.[c.key] as number | null) ?? null;
            const cnt = (summary?.[c.countKey] as number | null) ?? 0;
            return (
              <div key={String(c.key)} className="flex items-center justify-between gap-3 rounded-lg px-4 py-3" style={{ background: "var(--bg)", border: "1px solid var(--line)" }}>
                <span className="text-sm" style={{ color: "var(--ink)" }}>{c.label}</span>
                <div className="flex items-center gap-2">
                  <StarRating value={val ?? 0} readOnly size={16} />
                  <span className="w-16 text-right type-meta">
                    {val != null ? `${val.toFixed(1)} (${cnt})` : "— (0)"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function overallBadgeColor(overall: number | null): string {
  if (overall == null) return "bg-zinc-300";
  if (overall >= 4) return "bg-emerald-500";
  if (overall >= 3) return "bg-amber-500";
  return "bg-red-500";
}
