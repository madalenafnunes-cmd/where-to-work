"use client";

import { useState } from "react";

type Props = {
  value: number | null;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
};

// 5 stars, half-step resolution, tap-to-set.
// For input: clicking the left half of a star sets X.5, the right half sets X.
export default function StarRating({ value, onChange, size = 28, readOnly }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;

  return (
    <div className="flex items-center gap-1" role={readOnly ? undefined : "slider"} aria-valuemin={0} aria-valuemax={5} aria-valuenow={value ?? 0}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          index={i}
          display={display}
          size={size}
          readOnly={readOnly}
          onHover={(v) => !readOnly && setHover(v)}
          onLeave={() => !readOnly && setHover(null)}
          onPick={(v) => onChange?.(v)}
        />
      ))}
    </div>
  );
}

function Star({
  index,
  display,
  size,
  readOnly,
  onHover,
  onLeave,
  onPick,
}: {
  index: number;
  display: number;
  size: number;
  readOnly?: boolean;
  onHover: (v: number) => void;
  onLeave: () => void;
  onPick: (v: number) => void;
}) {
  // How much of this star is filled (0, 0.5, 1)
  const fill = Math.max(0, Math.min(1, display - (index - 1)));
  const isHalf = fill > 0 && fill < 1;

  const commonProps = readOnly
    ? {}
    : {
        onMouseMove: (e: React.MouseEvent<HTMLButtonElement>) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const half = e.clientX - rect.left < rect.width / 2;
          onHover(index - (half ? 0.5 : 0));
        },
        onMouseLeave: onLeave,
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const half = e.clientX - rect.left < rect.width / 2;
          onPick(index - (half ? 0.5 : 0));
        },
      };

  return (
    <button
      type="button"
      disabled={readOnly}
      className={`relative inline-flex ${readOnly ? "cursor-default" : "cursor-pointer"}`}
      style={{ width: size, height: size }}
      {...commonProps}
    >
      {/* Empty star */}
      <svg viewBox="0 0 24 24" width={size} height={size} className="text-zinc-300">
        <path
          fill="currentColor"
          d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        />
      </svg>
      {/* Filled overlay (clipped) */}
      {fill > 0 && (
        <span
          aria-hidden
          className="absolute inset-0 overflow-hidden"
          style={{ width: isHalf ? "50%" : "100%" }}
        >
          <svg viewBox="0 0 24 24" width={size} height={size} className="text-amber-400">
            <path
              fill="currentColor"
              d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
            />
          </svg>
        </span>
      )}
    </button>
  );
}
