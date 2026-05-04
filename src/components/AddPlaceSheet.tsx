"use client";

import { useEffect, useRef, useState } from "react";
import { createCustomPlace } from "@/lib/customPlaces";
import { searchPlace, type NominatimSearchResult } from "@/lib/nominatim";
import type { OsmPlace } from "@/lib/types";
import StarRating from "./StarRating";

type Props = {
  lat: number;
  lng: number;
  onCancel: () => void;
  onCreated: (place: OsmPlace) => void;
};

export default function AddPlaceSheet({ lat, lng, onCancel, onCreated }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<NominatimSearchResult | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [laptopFriendly, setLaptopFriendly] = useState<number | null>(null);
  const [noiseLevel, setNoiseLevel] = useState<number | null>(null);
  const [plugs, setPlugs] = useState<number | null>(null);
  const [wifi, setWifi] = useState<number | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [food, setFood] = useState<number | null>(null);
  const [coffee, setCoffee] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const acRef = useRef<AbortController | null>(null);

  // Search for places as user types
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      acRef.current?.abort();
      const ac = new AbortController();
      acRef.current = ac;
      setSearchLoading(true);

      try {
        const results = await searchPlace(searchQuery, ac.signal);
        if (!ac.signal.aborted) {
          setSearchResults(results);
        }
      } catch {
        if (!ac.signal.aborted) {
          setSearchResults([]);
        }
      } finally {
        if (!ac.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectPlace = (place: NominatimSearchResult) => {
    setSelectedPlace(place);
    setName(place.display_name.split(",")[0]); // Use first part as name
    setAddress(place.display_name);
    setSearchQuery(place.display_name);
    setSearchOpen(false);
    setSearchResults([]);
  };

  async function submit() {
    if (!name.trim()) return;
    if (!selectedPlace) {
      setError("Please select a place from the search results");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const selectedLat = parseFloat(selectedPlace.lat);
      const selectedLng = parseFloat(selectedPlace.lon);

      const place = await createCustomPlace({
        name: name.trim(),
        address: address.trim() || null,
        lat: selectedLat,
        lng: selectedLng,
      });
      onCreated(place);
    } catch (e) {
      setError((e as Error).message || "Couldn't save place");
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
      aria-label="Add a place"
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 pt-5 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Add a place</h2>
          <div className="mt-0.5 text-xs text-zinc-500">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>
        </div>
        <button
          onClick={onCancel}
          aria-label="Close"
          className="-m-2 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-4">
          {/* Places autocomplete search */}
          <div className="relative">
            <label className="text-base font-medium text-zinc-800 mb-1.5 block">Place name *</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              placeholder="Search for a cafe or coworking space…"
              className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-800 outline-none focus:border-zinc-400"
              autoFocus
            />
            {searchOpen && (searchResults.length > 0 || searchLoading) && (
              <div className="absolute left-0 right-0 top-full z-[1200] mt-1 max-h-72 overflow-y-auto rounded-lg bg-white border border-zinc-200 shadow-lg">
                {searchLoading && <div className="px-3 py-2 text-xs text-zinc-400">Searching…</div>}
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectPlace(result);
                    }}
                    className="block w-full truncate px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 border-b border-zinc-100 last:border-b-0"
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPlace && (
            <div className="rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800">
              Selected: {selectedPlace.display_name}
            </div>
          )}

          {/* Rating section */}
          <div className="border-t border-zinc-200 pt-4">
            <p className="text-sm font-medium text-zinc-700 mb-4">Rate this place</p>

            <div className="space-y-4">
              <div>
                <label className="text-base font-medium text-zinc-700 mb-2 block">💻 Laptop-Friendly</label>
                <StarRating value={laptopFriendly} onChange={setLaptopFriendly} size={24} />
              </div>
              <div>
                <label className="text-base font-medium text-zinc-700 mb-2 block">🔊 Noise Level</label>
                <StarRating value={noiseLevel} onChange={setNoiseLevel} size={24} />
              </div>
              <div>
                <label className="text-base font-medium text-zinc-700 mb-2 block">🔌 Plugs & Outlets</label>
                <StarRating value={plugs} onChange={setPlugs} size={24} />
              </div>
              <div>
                <label className="text-base font-medium text-zinc-700 mb-2 block">📶 Wi-Fi Quality</label>
                <StarRating value={wifi} onChange={setWifi} size={24} />
              </div>
              <div>
                <label className="text-base font-medium text-zinc-700 mb-2 block">💰 Price</label>
                <StarRating value={price} onChange={setPrice} size={24} />
              </div>
              <div>
                <label className="text-base font-medium text-zinc-700 mb-2 block">🍽️ Food Quality</label>
                <StarRating value={food} onChange={setFood} size={24} />
              </div>
              <div>
                <label className="text-base font-medium text-zinc-700 mb-2 block">☕ Coffee Quality</label>
                <StarRating value={coffee} onChange={setCoffee} size={24} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-base font-medium text-zinc-700">Additional Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Closing hours, WiFi password, special info"
                  maxLength={300}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-base text-zinc-800 outline-none focus:border-zinc-400 resize-none"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>
      </div>

      <div className="flex gap-2 border-t border-zinc-100 bg-white px-5 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-zinc-200 px-4 py-3 text-base font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!name.trim() || !selectedPlace || submitting}
          onClick={submit}
          className="flex-[2] rounded-full bg-zinc-900 px-4 py-3 text-base font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-300"
        >
          {submitting ? "Saving…" : "Save place"}
        </button>
      </div>
    </div>
  );
}
