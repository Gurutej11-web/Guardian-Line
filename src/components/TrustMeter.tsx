"use client";

import { TrustBand } from "@/lib/types";
import { useSettings } from "@/context/SettingsContext";

const bandColor: Record<TrustBand, string> = {
  safe: "var(--trust-safe)",
  caution: "var(--trust-caution)",
  danger: "var(--trust-danger)",
};

const bandLabelKey: Record<TrustBand, "safe" | "caution" | "danger"> = {
  safe: "safe",
  caution: "caution",
  danger: "danger",
};

interface TrustMeterProps {
  trustScore: number;
  band: TrustBand;
  voiceAuthScore: number;
  transcriptRiskScore: number;
  size?: number;
}

export function TrustMeter({
  trustScore,
  band,
  voiceAuthScore,
  transcriptRiskScore,
  size = 220,
}: TrustMeterProps) {
  const { strings } = useSettings();
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, trustScore)) / 100;
  const dashOffset = circumference * (1 - progress);
  const color = bandColor[band];

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative ${band === "danger" ? "pulse-ring" : ""}`}
        style={{ width: size, height: size, ["--ring-color" as string]: color }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--background-elevated)"
            strokeWidth={14}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold tabular-nums" style={{ color }}>
            {Math.round(trustScore)}
          </span>
          <span className="mt-1 text-xs uppercase tracking-wide text-foreground-muted">
            {strings.trustMeter.title}
          </span>
        </div>
      </div>

      <div
        className="mt-4 rounded-full px-4 py-1.5 text-sm font-semibold"
        style={{ color, backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
      >
        {strings.trustMeter[bandLabelKey[band]]}
      </div>

      <div className="mt-5 w-full max-w-[260px] space-y-3">
        <MeterBar label={strings.trustMeter.voiceAuth} value={voiceAuthScore} />
        <MeterBar label={strings.trustMeter.transcriptRisk} value={transcriptRiskScore} />
      </div>
    </div>
  );
}

function MeterBar({ label, value }: { label: string; value: number }) {
  const barColor = value >= 65 ? "var(--trust-danger)" : value >= 32 ? "var(--trust-caution)" : "var(--trust-safe)";
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-foreground-muted">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(value)}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-background-elevated">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}
