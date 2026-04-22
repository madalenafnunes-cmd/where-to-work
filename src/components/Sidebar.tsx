"use client";

import { useState } from "react";
import StarRating from "./StarRating";

type FilterState = {
  noise: number | null;
  plugs: number | null;
  wifi: number | null;
  laptop_friendly: number | null;
  price: number | null;
  food: number | null;
  coffee: number | null;
};

const FILTER_CATEGORIES = [
  { key: "noise", label: "Noise Level", icon: "🔊" },
  { key: "plugs", label: "Plugs & Outlets", icon: "🔌" },
  { key: "wifi", label: "Wi-Fi Quality", icon: "📶" },
  { key: "laptop_friendly", label: "Laptop-Friendly", icon: "💻" },
  { key: "price", label: "Price", icon: "💰" },
  { key: "food", label: "Food Quality", icon: "🍽️" },
  { key: "coffee", label: "Coffee Quality", icon: "☕" },
];

type Props = {
  onFiltersChange?: (filters: FilterState) => void;
};

export default function Sidebar({ onFiltersChange }: Props) {
  const [filters, setFilters] = useState<FilterState>({
    noise: null,
    plugs: null,
    wifi: null,
    laptop_friendly: null,
    price: null,
    food: null,
    coffee: null,
  });

  const handleFilterChange = (key: keyof FilterState, value: number | null) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const clearAllFilters = () => {
    const emptyFilters: FilterState = {
      noise: null,
      plugs: null,
      wifi: null,
      laptop_friendly: null,
      price: null,
      food: null,
      coffee: null,
    };
    setFilters(emptyFilters);
    onFiltersChange?.(emptyFilters);
  };

  return (
    <aside className="h-full overflow-y-auto bg-[var(--surface)] border-r border-[var(--line)] px-6 py-6 flex flex-col">
      {/* Hero heading */}
      <div className="mb-8">
        <h1 className="type-display mb-2" style={{ color: "var(--ink)" }}>
          Find where to work near you
        </h1>
        <p className="type-meta">Filter by what matters to you</p>
      </div>

      {/* Filter sections */}
      <div className="flex-1 space-y-6 mb-6">
        {FILTER_CATEGORIES.map((cat) => (
          <div key={cat.key}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{cat.icon}</span>
              <label className="type-label" style={{ color: "var(--ink-muted)" }}>
                {cat.label}
              </label>
            </div>
            <div className="flex items-center gap-3">
              <StarRating
                value={filters[cat.key as keyof FilterState]}
                onChange={(v) => handleFilterChange(cat.key as keyof FilterState, v)}
                size={24}
              />
              {filters[cat.key as keyof FilterState] != null && (
                <button
                  onClick={() => handleFilterChange(cat.key as keyof FilterState, null)}
                  className="text-xs font-medium transition"
                  style={{ color: "var(--ink-muted)" }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Advanced search & clear all */}
      <div className="space-y-2 pt-4 border-t border-[var(--line)]">
        <button
          className="w-full rounded-full px-4 py-3 text-sm font-medium transition border"
          style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--bg)" }}
          onClick={clearAllFilters}
        >
          Clear filters
        </button>
        <button
          className="w-full rounded-full px-4 py-3 text-sm font-medium text-white transition"
          style={{ background: "var(--accent)" }}
        >
          Advanced search
        </button>
      </div>
    </aside>
  );
}
