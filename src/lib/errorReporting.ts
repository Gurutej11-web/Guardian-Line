/**
 * Minimal error-reporting seam.
 *
 * This is intentionally NOT a real Sentry/Bugsnag/etc. integration —
 * wiring one up needs a DSN and an account this environment doesn't
 * have. What's here is the honest, working stand-in: errors are logged
 * to the console (so they show up in any real error-tracking setup that
 * hooks console output) and kept in a capped in-memory/localStorage
 * buffer so recent crashes survive a reload for debugging. Swapping in
 * a real provider later means replacing the body of `reportError`
 * without touching any call site.
 */

export interface ReportedError {
  message: string;
  stack?: string;
  context: Record<string, string>;
  timestamp: string;
}

const STORAGE_KEY = "guardianline.errorLog.v1";
const MAX_ENTRIES = 20;

export function reportError(error: Error, context: Record<string, string> = {}) {
  const entry: ReportedError = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  };

  console.error("[Guardian Line]", entry.message, entry);

  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const existing: ReportedError[] = raw ? JSON.parse(raw) : [];
    existing.unshift(entry);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, MAX_ENTRIES)));
  } catch {
    // localStorage unavailable or full — the console.error above is
    // still the source of truth, so this is a non-fatal best-effort.
  }
}

export function getRecentErrors(): ReportedError[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
