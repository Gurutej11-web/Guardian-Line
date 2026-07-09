"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failing (e.g. unsupported browser, blocked by an
      // extension) shouldn't break the app — it's a progressive
      // enhancement, not a requirement.
    });
  }, []);

  return null;
}
