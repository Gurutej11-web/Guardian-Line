"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/errorReporting";

/** Catches crashes that escape even the route-level error.tsx (e.g. a
 * failure in the root layout itself) — replaces the entire document, so
 * it has to render its own <html>/<body>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { boundary: "global" });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#0a0e1a", color: "#e8ecf7", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 420, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Guardian Line hit an unexpected error</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "#8d97b5" }}>
            Your saved reports and settings are untouched — they live in this browser&apos;s storage, not in memory.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              borderRadius: 999,
              background: "#2f5cc7",
              color: "white",
              border: "none",
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
