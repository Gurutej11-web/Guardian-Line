"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/context/SettingsContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "guardianline.installPromptDismissed";

/**
 * There's no native iOS/Android app in this build — building one would
 * mean a separate Xcode/Android Studio project outside this repo's
 * tooling. What's real and buildable here is the PWA install path: the
 * manifest + service worker (see public/) already make the site
 * installable, so this component surfaces the browser's own
 * `beforeinstallprompt` event as a friendly banner instead of leaving
 * installability undiscoverable.
 */
export function InstallPrompt() {
  const { settings } = useSettings();
  const lang = settings.language;
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // sessionStorage read is client-only.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(window.sessionStorage.getItem(DISMISSED_KEY) === "1");

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!deferredEvent || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-fade-in-up rounded-2xl border border-border-subtle bg-background-card p-4 shadow-xl">
      <p className="text-sm font-medium">
        {lang === "en" ? "Install Guardian Line" : "Instala Guardian Line"}
      </p>
      <p className="mt-1 text-xs text-foreground-muted">
        {lang === "en"
          ? "Add it to your home screen for one-tap access during a call."
          : "Agrégala a tu pantalla de inicio para acceder con un toque durante una llamada."}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={async () => {
            await deferredEvent.prompt();
            await deferredEvent.userChoice;
            setDeferredEvent(null);
          }}
          className="btn-press rounded-full bg-accent-solid px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-solid-hover"
        >
          {lang === "en" ? "Install" : "Instalar"}
        </button>
        <button
          onClick={() => {
            window.sessionStorage.setItem(DISMISSED_KEY, "1");
            setDismissed(true);
          }}
          className="btn-press rounded-full border border-border-strong px-4 py-1.5 text-xs font-medium hover:bg-background-elevated"
        >
          {lang === "en" ? "Not now" : "Ahora no"}
        </button>
      </div>
    </div>
  );
}
