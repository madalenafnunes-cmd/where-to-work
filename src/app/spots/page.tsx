"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import PlaceSheet from "@/components/PlaceSheet";
import { fetchTopPlaces, generateCategoryTags, type PlaceWithRating } from "@/lib/topPlaces";
import { getSupabase, type RatingSummary } from "@/lib/supabase";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { OsmPlace } from "@/lib/types";

export default function SpotsPage() {
  const searchParams = useSearchParams();
  const location = searchParams.get("near") || "";
  const geo = useGeolocation();

  const [places, setPlaces] = useState<PlaceWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<OsmPlace | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<RatingSummary | null>(null);
  const [summaryToken, setSummaryToken] = useState(0);

  const userLoc = geo.status === "granted" ? { lat: geo.lat, lng: geo.lng } : null;

  useEffect(() => {
    const fetchPlaces = async () => {
      setLoading(true);
      const results = await fetchTopPlaces(location, 10);
      setPlaces(results);
      setLoading(false);
    };

    if (location) {
      fetchPlaces();
    }
  }, [location]);

  // Fetch rating summary for selected place
  useEffect(() => {
    if (!selectedPlace) {
      setSelectedSummary(null);
      return;
    }

    const sb = getSupabase();
    if (!sb) return;

    let aborted = false;
    (async () => {
      const { data } = await sb
        .from("place_ratings_summary")
        .select("*")
        .eq("osm_id", selectedPlace.osmId)
        .maybeSingle();
      if (!aborted && data) {
        setSelectedSummary(data as RatingSummary);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [selectedPlace, summaryToken]);

  return (
    <main className="min-h-dvh bg-[var(--bg)]">
      <TopNav />

      <div className="pt-20 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="type-h2 mb-2" style={{ color: "var(--ink)" }}>
            Top spots near {location}
          </h1>
          <p className="type-meta mb-8">
            {places.length} place{places.length !== 1 ? "s" : ""} reviewed
          </p>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" />
            </div>
          ) : places.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: "var(--surface)" }}>
              <svg
                viewBox="0 0 24 24"
                className="w-12 h-12 mx-auto mb-4 opacity-30"
                fill="none"
                stroke="var(--ink-muted)"
                strokeWidth="2"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <h3 className="type-body font-medium mb-2" style={{ color: "var(--ink)" }}>
                Not many spots reviewed here yet
              </h3>
              <p className="type-meta mb-6">Be the first to add one and share your experience.</p>
              <Link
                href={`/map?near=${encodeURIComponent(location)}`}
                className="inline-block px-6 py-3 rounded-full font-medium transition"
                style={{
                  background: "var(--accent)",
                  color: "white",
                }}
              >
                Add a place
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {places.map((place) => (
                <button
                  key={place.osmId}
                  onClick={() => setSelectedPlace(place)}
                  className="w-full rounded-xl p-4 transition text-left hover:shadow-soft"
                  style={{ background: "var(--surface)" }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold flex-1" style={{ color: "var(--ink)" }}>
                      {place.name}
                    </h3>
                    {place.overall_rating !== null && place.overall_rating !== undefined && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" style={{ color: "var(--accent)" }}>
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                        <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                          {place.overall_rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  {place.address && (
                    <p className="text-xs mb-2 line-clamp-1" style={{ color: "var(--ink-muted)" }}>
                      {place.address}
                    </p>
                  )}

                  {place.rating_count != null && place.rating_count > 0 && (
                    <p className="text-xs mb-2" style={{ color: "var(--ink-muted)" }}>
                      {place.rating_count} rating{place.rating_count !== 1 ? "s" : ""}
                    </p>
                  )}

                  {place.overall_rating !== null && place.overall_rating !== undefined && (
                    <div className="flex flex-wrap gap-1.5">
                      {generateCategoryTags(place).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 rounded-full"
                          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}

              <Link
                href={`/map?near=${encodeURIComponent(location)}`}
                className="flex items-center justify-center w-full mt-6 py-3 rounded-full font-medium transition border"
                style={{
                  borderColor: "var(--accent)",
                  color: "var(--accent)",
                  background: "transparent",
                }}
              >
                Find more
              </Link>
            </div>
          )}
        </div>
      </div>

      {selectedPlace && (
        <PlaceSheet
          place={selectedPlace}
          summary={selectedSummary}
          userLoc={userLoc}
          onClose={() => setSelectedPlace(null)}
          onRatingSaved={() => setSummaryToken((t) => t + 1)}
        />
      )}
    </main>
  );
}
