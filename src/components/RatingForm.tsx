"use client";

import { useState } from "react";
import StarRating from "./StarRating";
import type { RatingInput } from "@/lib/supabase";

const CATEGORIES: Array<{
  key: keyof Omit<RatingInput, "note">;
  label: string;
  hint: string;
}> = [
  { key: "noise", label: "Noise level", hint: "Quiet = 5 stars, loud = 1" },
  { key: "plugs", label: "Plugs / outlets", hint: "Many = 5, none = 1" },
  { key: "wifi", label: "Wi-Fi quality", hint: "Fast & reliable = 5" },
  { key: "laptop_friendly", label: "Laptop-friendliness", hint: "Welcome to linger = 5" },
  { key: "price", label: "Price", hint: "5 = affordable, 1 = expensive" },
  { key: "food", label: "Food quality", hint: "Great = 5" },
  { key: "coffee", label: "Coffee quality", hint: "Great = 5" },
];

type Props = {
  initial?: Partial<RatingInput>;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (r: RatingInput) => void;
};

export default function RatingForm({ initial, submitting, onCancel, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, number | null>>(() => ({
    noise: initial?.noise ?? null,
    plugs: initial?.plugs ?? null,
    wifi: initial?.wifi ?? null,
    laptop_friendly: initial?.laptop_friendly ?? null,
    price: initial?.price ?? null,
    food: initial?.food ?? null,
    coffee: initial?.coffee ?? null,
  }));
  const [note, setNote] = useState<string>(initial?.note ?? "");

  const hasAny = Object.values(values).some((v) => v != null);

  function submit() {
    if (!hasAny) return;
    onSubmit({
      noise: values.noise,
      plugs: values.plugs,
      wifi: values.wifi,
      laptop_friendly: values.laptop_friendly,
      price: values.price,
      food: values.food,
      coffee: values.coffee,
      note: note.trim() ? note.trim() : null,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {CATEGORIES.map((c) => (
        <div key={c.key} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <label className="type-label" style={{ color: "var(--ink-muted)" }}>{c.label}</label>
            <span className="type-meta">{c.hint}</span>
          </div>
          <div className="flex items-center gap-3">
            <StarRating
              value={values[c.key]}
              onChange={(v) => setValues((prev) => ({ ...prev, [c.key]: v }))}
            />
            {values[c.key] != null && (
              <button
                type="button"
                onClick={() => setValues((prev) => ({ ...prev, [c.key]: null }))}
                className="text-xs transition"
                style={{ color: "var(--ink-muted)" }}
              >
                clear
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <label className="type-label" style={{ color: "var(--ink-muted)" }}>ADDITIONAL NOTES</label>
        <input
          type="text"
          maxLength={140}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional — 140 chars max"
          className="w-full rounded-lg px-3 py-2 text-sm outline-none focus-ring"
          style={{ background: "var(--bg)", borderColor: "var(--line)", color: "var(--ink)" }}
        />
        <div className="text-right type-meta">{note.length}/140</div>
      </div>

      <div className="sticky bottom-0 flex gap-3 border-t px-6 py-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border px-4 py-3 text-sm font-medium transition hover:bg-[var(--bg)]"
          style={{ borderColor: "var(--line)", color: "var(--ink)" }}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!hasAny || submitting}
          onClick={submit}
          className="flex-[2] rounded-full px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
          style={{ background: !hasAny || submitting ? "var(--ink-muted)" : "var(--ink)" }}
        >
          {submitting ? "Submitting…" : "Submit rating"}
        </button>
      </div>
    </div>
  );
}
