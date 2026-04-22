// Thin wrapper around opening_hours.js. Returns a friendly status string.
// The lib has no first-party types; we keep the surface tiny and typed here.
import OpeningHours from "opening_hours";

export type OpenStatus =
  | { kind: "unknown" }
  | { kind: "open" }
  | { kind: "closed" }
  | { kind: "invalid" };

export function parseOpenStatus(tag: string | undefined, at: Date = new Date()): OpenStatus {
  if (!tag || !tag.trim()) return { kind: "unknown" };
  try {
    const oh = new OpeningHours(tag);
    return oh.getState(at) ? { kind: "open" } : { kind: "closed" };
  } catch {
    return { kind: "invalid" };
  }
}

export function formatOpenStatus(s: OpenStatus): string {
  switch (s.kind) {
    case "open": return "Open now";
    case "closed": return "Closed";
    case "invalid": return "Hours unknown";
    case "unknown": return "Hours unknown";
  }
}
