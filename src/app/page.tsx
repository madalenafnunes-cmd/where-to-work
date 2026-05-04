"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGeolocation } from "@/hooks/useGeolocation";
import { reverseGeocode } from "@/lib/nominatim";

export default function LandingPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const geoState = useGeolocation();

  const handleFindNearMe = async () => {
    if (geoState.status === "granted") {
      setGeoLoading(true);
      try {
        // Convert coordinates to location name
        const locationName = await reverseGeocode(geoState.lat, geoState.lng);
        if (locationName) {
          router.push(`/spots?near=${encodeURIComponent(locationName)}`);
        } else {
          // Fallback: use coordinates if reverse geocoding fails
          router.push(`/spots?near=${geoState.lat},${geoState.lng}`);
        }
      } catch (error) {
        console.error("Reverse geocoding failed:", error);
        // Fallback: use coordinates
        router.push(`/spots?near=${geoState.lat},${geoState.lng}`);
      } finally {
        setGeoLoading(false);
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/spots?near=${encodeURIComponent(searchInput)}`);
    }
  };

  return (
    <main className="min-h-dvh w-dvw flex items-center justify-center bg-[var(--bg)] overflow-hidden relative">
      {/* Animated dots background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: "var(--accent)",
              opacity: 0.1,
              animation: `float-dots ${3 + i * 0.5}s ease-in-out infinite`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full px-6 max-w-lg">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <svg viewBox="0 0 24 24" className="w-12 h-12" fill="var(--accent)" stroke="none">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 7 10 13 10 13s10-6 10-13c0-5.52-4.48-10-10-10zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
            </svg>
          </div>
          <h1 className="type-h2 mb-6" style={{ color: "var(--ink)" }}>
            Where to Work
          </h1>
        </div>

        {/* Headline */}
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-6" style={{ color: "var(--ink)" }}>
          Skip the bad wifi.
          <br />
          Find spots people<br />
          actually love.
        </h2>

        {/* Subheadline */}
        <p className="text-center type-body mb-10" style={{ color: "var(--ink-muted)" }}>
          See what places people are best rated for working — or rate a place yourself.
        </p>

        {/* Buttons */}
        <div className="space-y-4">
          {/* Find near me button */}
          <button
            onClick={handleFindNearMe}
            disabled={geoState.status === "pending" || geoLoading}
            className="w-full py-3 px-4 rounded-full font-medium transition flex items-center justify-center gap-2"
            style={{
              background: "var(--accent)",
              color: "white",
              opacity: geoState.status === "pending" || geoLoading ? 0.7 : 1,
            }}
          >
            {geoState.status === "pending" || geoLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Finding location…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Find near me
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
            <span className="text-sm" style={{ color: "var(--ink-muted)" }}>
              or search
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
          </div>

          {/* Search form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search location…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 px-4 py-3 rounded-full border"
              style={{
                borderColor: "var(--line)",
                background: "var(--surface)",
                color: "var(--ink)",
              }}
            />
            <button
              type="submit"
              disabled={!searchInput.trim()}
              className="px-6 py-3 rounded-full font-medium transition flex items-center gap-2"
              style={{
                background: searchInput.trim() ? "var(--accent)" : "var(--line)",
                color: searchInput.trim() ? "white" : "var(--ink-muted)",
              }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* CSS for floating dots animation */}
      <style jsx>{`
        @keyframes float-dots {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.1;
          }
          25% {
            opacity: 0.2;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.15;
          }
          75% {
            opacity: 0.1;
          }
        }
      `}</style>
    </main>
  );
}
