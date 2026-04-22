"use client";

import { useEffect, useState } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { removeFavorite, type Favorite } from "@/lib/favorites";
import { getSupabase, type RatingSummary } from "@/lib/supabase";

type Props = {
  userLoc: { lat: number; lng: number } | null;
  onPick: (f: Favorite) => void;
  onClose: () => void;
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function fmtDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function badgeColor(r: number | null): string {
  if (r == null) return "bg-zinc-300";
  if (r >= 4) return "bg-emerald-500";
  if (r >= 3) return "bg-amber-500";
  return "bg-red-500";
}

export default function FavoritesPanel({ userLoc, onPick, onClose }: Props) {
  const favs = useFavorites();
  const [summaries, setSummaries] = useState<Record<string, RatingSummary>>({});

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || favs.length === 0) return;
    let aborted = false;
    (async () => {
      const { data } = await sb
        .from("place_ratings_summary")
        .select("osm_id, overall_rating, rating_count")
        .in("osm_id", favs.map((f) => f.osmId));
      if (aborted || !data) return;
      const map: Record<string, RatingSummary> = {};
      for (const row of data as RatingSummary[]) map[row.osm_id] = row;
      setSummaries(map);
    })();
    return () => { aborted = true; };
  }, [favs]);

  return (
    <div
      className="
        fixed inset-x-0 bottom-0 z-[1100] max-h-[85dvh] rounded-t-2xl bg-white shadow-2xl ring-1 ring-black/5
        md:inset-y-0 md:left-0 md:right-auto md:bottom-auto md:top-0 md:h-full md:max-h-none md:w-[420px] md:rounded-none md:rounded-r-2xl
        flex flex-col
      "
      role="dialog"
      aria-label="Favorites"
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 pt-5 pb-4">
        <h2 className="text-lg font-semibold text-zinc-900">Favorites</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="-m-2 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {favs.length === 0 ? (
          <div className="mt-6 px-6 text-center text-sm text-zinc-500">
            No favorites yet. Tap the heart on any place to save it here.
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {favs.map((f) => {
              const sum = summaries[f.osmId];
              const overall = sum?.overall_rating ?? null;
              const count = sum?.rating_count ?? 0;
              const dist = userLoc ? haversineKm(userLoc, f) : null;
              return (
                <li key={f.osmId}>
                  <button
                    onClick={() => onPick(f)}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-zinc-50"
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white ${badgeColor(overall)}`}>
                      {overall != null ? overall.toFixed(1) : "–"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-zinc-900">{f.name}</div>
                      <div className="text-xs text-zinc-500">
                        {dist != null ? fmtDist(dist) : "distance unknown"}
                        {count > 0 ? ` · ${count} rating${count === 1 ? "" : "s"}` : " · no ratings"}
                      </div>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Remove favorite"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(f.osmId);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          removeFavorite(f.osmId);
                        }
                      }}
                      className="rounded-full p-1.5 text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-600"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
