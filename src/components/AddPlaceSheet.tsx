"use client";

import { useState } from "react";
import { createCustomPlace } from "@/lib/customPlaces";
import type { OsmPlace } from "@/lib/types";

type Props = {
  lat: number;
  lng: number;
  onCancel: () => void;
  onCreated: (place: OsmPlace) => void;
};

export default function AddPlaceSheet({ lat, lng, onCancel, onCreated }: Props) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const place = await createCustomPlace({
        name: name.trim(),
        address: address.trim() || null,
        lat,
        lng,
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
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-800">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fauna & Flora"
              maxLength={80}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-800">Address <span className="text-zinc-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Rua da Esperança 33"
              maxLength={160}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400"
            />
          </div>

          <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            You&apos;ll be able to rate it right after. This place will show up as a purple pin for everyone using the app.
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-t border-zinc-100 bg-white px-5 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!name.trim() || submitting}
          onClick={submit}
          className="flex-[2] rounded-full bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-300"
        >
          {submitting ? "Saving…" : "Save place"}
        </button>
      </div>
    </div>
  );
}
