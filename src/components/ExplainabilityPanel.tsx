"use client";

import { RiskFlag, Severity } from "@/lib/types";
import { categoryLabels } from "@/lib/i18n";
import { useSettings } from "@/context/SettingsContext";
import { AlertIcon } from "./icons";

const severityColor: Record<Severity, string> = {
  low: "var(--trust-safe)",
  medium: "var(--trust-caution)",
  high: "var(--trust-danger)",
};

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ExplainabilityPanel({ flags }: { flags: RiskFlag[] }) {
  const { settings } = useSettings();
  const sorted = [...flags].sort((a, b) => b.timestampMs - a.timestampMs);

  if (sorted.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center text-sm text-foreground-muted px-4">
        {settings.language === "en"
          ? "No risk signals yet — every flag will show up here with a plain-language reason."
          : "Aún no hay señales de riesgo — cada alerta aparecerá aquí con una razón clara."}
      </div>
    );
  }

  return (
    <div className="scrollbar-thin flex h-full flex-col gap-2 overflow-y-auto pr-1">
      {sorted.map((flag) => (
        <div
          key={flag.id}
          className="animate-fade-in-up flex items-start gap-3 rounded-xl border border-border-subtle bg-background-elevated px-3.5 py-3"
        >
          <div
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `color-mix(in srgb, ${severityColor[flag.severity]} 18%, transparent)` }}
          >
            <AlertIcon className="h-3.5 w-3.5" style={{ color: severityColor[flag.severity] }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold" style={{ color: severityColor[flag.severity] }}>
                {categoryLabels[flag.category][settings.language]}
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-foreground-muted">
                {formatTime(flag.timestampMs)}
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-foreground-muted">{flag.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
