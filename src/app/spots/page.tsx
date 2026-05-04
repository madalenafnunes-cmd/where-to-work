"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import PlaceSheet from "@/components/PlaceSheet";
import { fetchTopPlaces, generateCategoryTags, type PlaceWithRating } from "@/lib/topPlaces";
import { getSupabase, type RatingSummary } from "@/lib/supabase";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { OsmPlace } from "@/lib/types";

function SpotsPageContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const q = searchParams.get("q");
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const geo = useGeolocation();

  const [places, setPlaces] = useState<PlaceWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<OsmPlace | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<RatingSummary | null>(null);
  const [summaryToken, setSummaryToken] = useState(0);

  // Determine location string for API calls and title
  const locationString = q || `${latParam},${lngParam}` || "";

  // Parse user coordinates from params or geolocation
  const userLat = latParam ? parseFloat(latParam) : null;
  const userLng = lngParam ? parseFloat(lngParam) : null;
  const userLoc = userLat != null && userLng != null ? { lat: userLat, lng: userLng } : null;

  // Determine title text
  const titleText =
    mode === "near-me" ? "Top spots near me" : q ? `Top spots near ${q}` : "Top spots";

  useEffect(() => {
    const fetchPlaces = async () => {
      setLoading(true);
      const results = await fetchTopPlaces(locationString, 10, userLat ?? undefined, userLng ?? undefined);
      setPlaces(results);
      setLoading(false);
    };

    if (locationString) {
      fetchPlaces();
    }
  }, [locationString, userLat, userLng]);

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
            {titleText}
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
                href={`/map?q=${encodeURIComponent(q || locationString)}`}
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
              {places.map((place) => {
                const tags = generateCategoryTags(place);
                const displayTags = tags.slice(0, 2); // Show only top 2 badges
                return (
                  <button
                    key={place.osmId}
                    onClick={() => setSelectedPlace(place)}
                    className="w-full rounded-xl p-4 transition text-left hover:shadow-soft"
                    style={{ background: "var(--surface)" }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold" style={{ color: "var(--ink)" }}>
                          {place.name}
                        </h3>
                        {place.address && (
                          <p className="text-xs mt-1 line-clamp-1" style={{ color: "var(--ink-muted)" }}>
                            {place.address}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {place.overall_rating != null && (
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                              {place.overall_rating.toFixed(1)}
                            </span>
                            <span style={{ color: "var(--accent)" }}>★</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-muted)" }}>
                          {place.rating_count != null && place.rating_count > 0 && (
                            <span>({place.rating_count})</span>
                          )}
                          {place.distance != null && (
                            <span>{place.distance.toFixed(1)} km</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {displayTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {displayTags.map((tag) => (
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
                );
              })}

              <Link
                href={`/map?q=${encodeURIComponent(q || locationString)}`}
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

export default function SpotsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh bg-[var(--bg)] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" />
        </main>
      }
    >
      <SpotsPageContent />
    </Suspense>
  );
}
