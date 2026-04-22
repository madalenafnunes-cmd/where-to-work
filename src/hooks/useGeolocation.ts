"use client";

import { useEffect, useState } from "react";

export type GeoState =
  | { status: "pending" }
  | { status: "granted"; lat: number; lng: number }
  | { status: "denied" }
  | { status: "unavailable" };

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({ status: "pending" });

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot browser capability check
      setState({ status: "unavailable" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({
        status: "granted",
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }),
      () => setState({ status: "denied" }),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  }, []);

  return state;
}
