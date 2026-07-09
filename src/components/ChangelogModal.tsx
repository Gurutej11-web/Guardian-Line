"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/context/SettingsContext";

export const CURRENT_VERSION = "1.1.0";
const STORAGE_KEY = "guardianline.lastSeenVersion";

const entries: { version: string; en: string[]; es: string[] }[] = [
  {
    version: "1.1.0",
    en: [
      "Light theme and a colorblind-safe palette",
      "Multiple Safe Words, one per family member",
      "Real-time audio waveform visualizer during live calls",
      "Reports: search, filters, trend chart, tags & notes, QR sharing",
    ],
    es: [
      "Tema claro y paleta segura para daltonismo",
      "Múltiples palabras seguras, una por familiar",
      "Visualizador de forma de onda en tiempo real durante llamadas",
      "Informes: búsqueda, filtros, gráfico de tendencia, etiquetas y notas",
    ],
  },
];

/** Stamps the changelog as seen without showing it — used when a
 * first-time user finishes (or skips) onboarding, since walking through
 * onboarding already covers what's new for someone who's never used the
 * app before. Without this, a brand-new user would see the onboarding
 * modal immediately followed by an unrelated "what's new" modal. */
export function markChangelogSeen() {
  window.localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
}

export function useChangelogVisible() {
  const { settings } = useSettings();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // Never show the changelog to someone who hasn't finished onboarding
    // yet — re-runs once hydration resolves hasSeenOnboarding to its
    // real stored value, so returning users are still shown updates.
    if (!settings.hasSeenOnboarding) return;
    const lastSeen = window.localStorage.getItem(STORAGE_KEY);
    // localStorage is only available client-side, so this can't be a
    // lazy useState initializer without causing a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (lastSeen !== CURRENT_VERSION) setVisible(true);
  }, [settings.hasSeenOnboarding]);
  return [visible, setVisible] as const;
}

export function ChangelogModal({ onClose }: { onClose: () => void }) {
  const { settings } = useSettings();
  const lang = settings.language;

  function close() {
    window.localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="animate-fade-in-up w-full max-w-sm rounded-2xl border border-border-strong bg-background-card p-6 shadow-2xl">
        <div className="text-xs font-semibold uppercase tracking-wide text-accent">
          {lang === "en" ? "What's new" : "Novedades"} · v{CURRENT_VERSION}
        </div>
        <ul className="mt-3 space-y-2 text-sm text-foreground-muted">
          {entries[0][lang].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-accent">•</span>
              {item}
            </li>
          ))}
        </ul>
        <button
          onClick={close}
          className="btn-press mt-5 w-full rounded-full bg-accent-solid px-4 py-2 text-sm font-semibold text-white hover:bg-accent-solid-hover"
        >
          {lang === "en" ? "Got it" : "Entendido"}
        </button>
      </div>
    </div>
  );
}
