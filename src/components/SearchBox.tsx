"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlace, type NominatimSearchResult } from "@/lib/nominatim";

type Props = {
  onPick: (lat: number, lng: number, label: string) => void;
};

export default function SearchBox({ onPick }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<NominatimSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const acRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (q.trim().length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing results when input shrinks
      setResults([]);
      setSelectedIndex(-1);
      return;
    }
    const timer = setTimeout(async () => {
      acRef.current?.abort();
      const ac = new AbortController();
      acRef.current = ac;
      setLoading(true);
      setSelectedIndex(-1);
      try {
        const r = await searchPlace(q, ac.signal);
        if (!ac.signal.aborted) setResults(r);
      } catch {
        if (!ac.signal.aborted) setResults([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [q]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      if (e.key === "Escape") {
        setOpen(false);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => (i < results.length - 1 ? i + 1 : i));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => (i > 0 ? i - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          const r = results[selectedIndex];
          onPick(parseFloat(r.lat), parseFloat(r.lon), r.display_name);
          setQ(r.display_name);
          setOpen(false);
          setSelectedIndex(-1);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handlePickResult = (r: NominatimSearchResult) => {
    onPick(parseFloat(r.lat), parseFloat(r.lon), r.display_name);
    setQ(r.display_name);
    setOpen(false);
    setSelectedIndex(-1);
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder="Search a city or address…"
        className="w-full rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-800 shadow-sm outline-none focus:border-zinc-400"
      />
      {open && (results.length > 0 || loading) && (
        <div className="absolute left-0 right-0 top-12 z-[1200] max-h-72 overflow-y-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/10">
          {loading && <div className="px-3 py-2 text-xs text-zinc-400">Searching…</div>}
          {results.map((r, idx) => (
            <button
              key={r.place_id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handlePickResult(r);
              }}
              className={`block w-full truncate px-3 py-2 text-left text-sm transition ${
                idx === selectedIndex
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
