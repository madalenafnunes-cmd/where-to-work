import Link from "next/link";

export default function TopNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] flex items-center justify-between h-16 bg-[var(--surface)] border-b border-[var(--line)] px-6 shadow-soft">
      {/* Left: Logo / Home link */}
      <Link href="/" className="flex items-center gap-2 font-semibold text-lg hover:opacity-80 transition" style={{ color: "var(--ink)" }}>
        {/* Simple map pin icon */}
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="var(--accent)" stroke="none">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 7 10 13 10 13s10-6 10-13c0-5.52-4.48-10-10-10zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
        </svg>
        <span className="hidden sm:inline">Where to Work</span>
      </Link>

      {/* Right: Navigation links */}
      <div className="flex items-center gap-6">
        <Link
          href="/ratings"
          className="text-sm font-medium hover:text-[var(--accent)] transition"
          style={{ color: "var(--ink)" }}
        >
          My Ratings
        </Link>
        <Link
          href="/favorites"
          className="text-sm font-medium hover:text-[var(--accent)] transition"
          style={{ color: "var(--ink)" }}
        >
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" stroke="none">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            Favorites
          </span>
        </Link>
      </div>
    </nav>
  );
}
