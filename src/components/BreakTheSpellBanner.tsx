"use client";

import { useSettings } from "@/context/SettingsContext";

export function BreakTheSpellBanner({ suggestion }: { suggestion: string }) {
  const { strings } = useSettings();
  return (
    <div className="animate-fade-in-up rounded-2xl border border-trust-danger/40 bg-trust-danger/10 px-5 py-4">
      <div className="text-sm font-semibold text-trust-danger">{strings.breakTheSpell.title}</div>
      <p className="mt-1 text-sm leading-relaxed text-foreground">{suggestion}</p>
    </div>
  );
}
