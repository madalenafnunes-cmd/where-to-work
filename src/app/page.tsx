"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";

// Leaflet touches `window` on import, so load the map client-side only.
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[var(--bg)] text-[var(--ink-muted)]">
      Loading map…
    </div>
  ),
});

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <main className="h-dvh w-dvw flex flex-col md:flex-row bg-[var(--bg)]">
      {/* Sidebar: hidden on mobile, visible on desktop, collapsible */}
      <div
        className={`hidden md:flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
          sidebarOpen ? "md:w-[380px]" : "md:w-0"
        }`}
      >
        <Sidebar />
      </div>

      {/* Map area + toggle button */}
      <div className="flex-1 flex flex-col relative">
        {/* Sidebar toggle (on the edge of sidebar, centered vertically) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden md:flex fixed top-1/2 z-[500] h-11 w-11 items-center justify-center rounded-full bg-white shadow-soft border border-[var(--line)] hover:bg-[var(--bg)] transition -translate-y-1/2"
          style={{ left: sidebarOpen ? "calc(380px - 22px)" : "calc(-22px)", color: "var(--ink)" }}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="15" y1="19" x2="15" y2="5" />
              <polyline points="8 12 15 5 15 19" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="9" y1="19" x2="9" y2="5" />
              <polyline points="16 12 9 5 9 19" />
            </svg>
          )}
        </button>

        {/* Mobile sidebar drawer */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-[400] flex flex-col">
            {/* Overlay */}
            <div
              className="flex-1 bg-black/20"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer */}
            <div className="bg-[var(--surface)] max-h-[70vh] overflow-y-auto rounded-t-2xl">
              <div className="px-6 py-2 flex justify-center">
                <div className="h-1 w-12 rounded-full bg-[var(--line)]" />
              </div>
              <Sidebar />
            </div>
          </div>
        )}

        {/* Map */}
        <Map />
      </div>
    </main>
  );
}
