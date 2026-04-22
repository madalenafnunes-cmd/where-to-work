"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` on import, so load the map client-side only.
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-zinc-500">
      Loading map…
    </div>
  ),
});

export default function Home() {
  return (
    <main className="h-dvh w-dvw">
      <Map />
    </main>
  );
}
