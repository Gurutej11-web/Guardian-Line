"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportError } from "@/lib/errorReporting";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { boundary: "route" });
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-trust-danger/15">
        <span className="text-xl">!</span>
      </div>
      <h1 className="mt-4 text-xl font-semibold">Something went wrong on this page</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        Nothing about your saved reports or settings was affected — this was just a rendering error. You can try again,
        or head back home.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="btn-press rounded-full bg-accent-solid px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-solid-hover"
        >
          Try again
        </button>
        <Link
          href="/"
          className="btn-press rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold hover:bg-background-elevated"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
