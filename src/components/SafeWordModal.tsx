"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "@/context/SettingsContext";
import { KeyIcon } from "./icons";

interface SafeWordModalProps {
  onResolve: (passed: boolean) => void;
  onSkip?: () => void;
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export function SafeWordModal({ onResolve, onSkip }: SafeWordModalProps) {
  const { settings, strings } = useSettings();
  const words = settings.safeWords.length > 0 ? settings.safeWords : settings.safeWord ? [{ id: "legacy", label: strings.appName, phrase: settings.safeWord }] : [];
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = dialog.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    focusable[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    dialog.addEventListener("keydown", onKeyDown);
    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="safe-word-title"
        className="animate-fade-in-up w-full max-w-sm rounded-2xl border border-border-strong bg-background-card p-6 shadow-2xl"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15">
          <KeyIcon className="h-5 w-5 text-accent" />
        </div>
        <h3 id="safe-word-title" className="mt-4 text-lg font-semibold">{strings.safeWord.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
          {strings.safeWord.prompt}
        </p>
        {words.length > 0 && (
          <div className="mt-3 space-y-1.5 rounded-lg bg-background-elevated px-3 py-2 text-xs text-foreground-muted">
            {words.map((w) => (
              <div key={w.id}>
                {w.label}: <span className="font-mono font-semibold text-foreground">{w.phrase}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={() => {
              vibrate(40);
              onResolve(true);
            }}
            className="rounded-full bg-trust-safe px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
          >
            {settings.language === "en" ? "They gave the correct word" : "Dieron la palabra correcta"}
          </button>
          <button
            onClick={() => {
              vibrate([30, 60, 30]);
              onResolve(false);
            }}
            className="rounded-full bg-trust-danger px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            {settings.language === "en" ? "They couldn't answer" : "No pudieron responder"}
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              className="mt-1 text-xs text-foreground-muted underline hover:text-foreground"
            >
              {settings.language === "en" ? "Skip — I already know this is them" : "Omitir — ya sé que es esta persona"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
