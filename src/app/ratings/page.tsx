"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { getSupabase, type RatingSummary } from "@/lib/supabase";
import { getContributorId } from "@/lib/contributor";

export default function RatingsPage() {
  const [ratedPlaces, setRatedPlaces] = useState<RatingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRatedPlaces = async () => {
      try {
        const sb = getSupabase();
        if (!sb) {
          setLoading(false);
          return;
        }

        const contributorId = getContributorId();
        const { data, error } = await sb
          .from("place_ratings_summary")
          .select("*")
          .eq("contributor_id", contributorId);

        if (!error && data) {
          setRatedPlaces(data as RatingSummary[]);
        }
      } catch (e) {
        console.error("Error fetching rated places:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchRatedPlaces();
  }, []);

  return (
    <main className="min-h-dvh bg-[var(--bg)]">
      <TopNav />

      <div className="pt-20 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="type-h2 mb-2" style={{ color: "var(--ink)" }}>
                My Ratings
              </h1>
              <p className="type-meta">
                {ratedPlaces.length} place{ratedPlaces.length !== 1 ? "s" : ""} rated
              </p>
            </div>
            <Link
              href="/explore"
              className="flex items-center justify-center h-10 w-10 rounded-full transition"
              style={{
                background: "var(--accent)",
                color: "white",
              }}
              aria-label="Close and return to map"
              title="Return to map"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" />
            </div>
          ) : ratedPlaces.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
              <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="var(--ink-muted)" strokeWidth="2">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
              </svg>
              <h3 className="type-body font-medium mb-2" style={{ color: "var(--ink)" }}>
                You haven't rated anywhere yet
              </h3>
              <p className="type-meta mb-6">
                Found a great spot? Be the first to review it.
              </p>
              <Link
                href="/explore"
                className="inline-block px-6 py-3 rounded-full font-medium transition"
                style={{
                  background: "var(--accent)",
                  color: "white",
                }}
              >
                Explore Places
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ratedPlaces.map((place) => (
                <Link
                  key={place.osm_id}
                  href={`/explore?lat=${place.lat}&lng=${place.lng}`}
                  className="group rounded-xl p-6 transition hover:shadow-soft"
                  style={{ background: "var(--surface)", borderColor: "var(--line)" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold flex-1 group-hover:text-[var(--accent)] transition" style={{ color: "var(--ink)" }}>
                      {place.name}
                    </h3>
                    {place.overall_rating && (
                      <div className="flex items-center gap-1 ml-2">
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                        <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                          {place.overall_rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  {place.address && (
                    <p className="type-meta mb-3 line-clamp-1">
                      {place.address}
                    </p>
                  )}
                  <div className="flex gap-2 text-xs">
                    {place.rating_count > 0 && (
                      <span className="px-2 py-1 rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                        {place.rating_count} rating{place.rating_count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
