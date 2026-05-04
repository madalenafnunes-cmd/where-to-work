"use client";

import Link from "next/link";
import TopNav from "@/components/TopNav";
import { useFavorites } from "@/hooks/useFavorites";
import { toggleFavorite } from "@/lib/favorites";

export default function FavoritesPage() {
  const favorites = useFavorites();

  return (
    <main className="min-h-dvh bg-[var(--bg)]">
      <TopNav />

      <div className="pt-20 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="type-h2 mb-2" style={{ color: "var(--ink)" }}>
            Favorites
          </h1>
          <p className="type-meta mb-8">
            {favorites.length} place{favorites.length !== 1 ? "s" : ""} saved
          </p>

          {favorites.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: "var(--surface)" }}>
              <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="var(--ink-muted)" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <h3 className="type-body font-medium mb-2" style={{ color: "var(--ink)" }}>
                No favorites yet
              </h3>
              <p className="type-meta mb-6">
                Tap the heart on a spot you love.
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
              {favorites.map((fav) => (
                <div
                  key={fav.osmId}
                  className="group rounded-xl p-6 transition hover:shadow-soft flex flex-col"
                  style={{ background: "var(--surface)" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <Link
                      href={`/explore?lat=${fav.lat}&lng=${fav.lng}`}
                      className="font-semibold flex-1 group-hover:text-[var(--accent)] transition"
                      style={{ color: "var(--ink)" }}
                    >
                      {fav.name}
                    </Link>
                    <button
                      onClick={() => toggleFavorite(fav)}
                      className="ml-2 transition"
                      aria-label="Remove from favorites"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" stroke="none" style={{ color: "var(--highlight)" }}>
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>
                  <p className="type-meta flex-1">
                    {fav.osmId.split("/")[0]}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
