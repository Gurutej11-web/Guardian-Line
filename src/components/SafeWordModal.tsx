"use client";

import { useSettings } from "@/context/SettingsContext";
import { KeyIcon } from "./icons";

interface SafeWordModalProps {
  onResolve: (passed: boolean) => void;
}

export function SafeWordModal({ onResolve }: SafeWordModalProps) {
  const { settings, strings } = useSettings();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="animate-fade-in-up w-full max-w-sm rounded-2xl border border-border-strong bg-background-card p-6 shadow-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15">
          <KeyIcon className="h-5 w-5 text-accent" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">{strings.safeWord.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
          {strings.safeWord.prompt}
        </p>
        {settings.safeWord && (
          <div className="mt-3 rounded-lg bg-background-elevated px-3 py-2 text-xs text-foreground-muted">
            {settings.language === "en" ? "Your registered safe word: " : "Tu palabra segura registrada: "}
            <span className="font-mono font-semibold text-foreground">{settings.safeWord}</span>
          </div>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={() => onResolve(true)}
            className="rounded-full bg-trust-safe px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
          >
            {settings.language === "en" ? "They gave the correct word" : "Dieron la palabra correcta"}
          </button>
          <button
            onClick={() => onResolve(false)}
            className="rounded-full bg-trust-danger px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            {settings.language === "en" ? "They couldn't answer" : "No pudieron responder"}
          </button>
        </div>
      </div>
    </div>
  );
}
