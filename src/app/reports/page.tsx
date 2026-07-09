"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { loadReports } from "@/lib/storage";
import { CallReport } from "@/lib/types";
import { ChevronRightIcon } from "@/components/icons";
import { Reveal } from "@/components/Reveal";
import { SkeletonReportCard } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";

const bandColor = {
  safe: "var(--trust-safe)",
  caution: "var(--trust-caution)",
  danger: "var(--trust-danger)",
} as const;

export default function ReportsPage() {
  const { settings } = useSettings();
  const lang = settings.language;
  const [reports, setReports] = useState<CallReport[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // localStorage is only available client-side, so this can't be a
    // lazy useState initializer without causing a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReports(loadReports());
    setLoaded(true);
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{settings.language === "en" ? "Reports" : "Informes"}</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        {lang === "en"
          ? "Post-call summaries are saved on this device only."
          : "Los resúmenes de llamadas se guardan solo en este dispositivo."}
      </p>

      {!loaded ? (
        <div className="mt-8 space-y-3">
          <SkeletonReportCard />
          <SkeletonReportCard />
          <SkeletonReportCard />
        </div>
      ) : reports.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border-subtle bg-background-card">
          <EmptyState
            title={lang === "en" ? "No calls yet" : "Aún no hay llamadas"}
            description={
              lang === "en"
                ? "Run a session from the Live Monitor to generate your first report."
                : "Ejecuta una sesión desde el Monitor en vivo para generar tu primer informe."
            }
          />
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {reports.map((r, i) => (
            <Reveal key={r.id} delayMs={Math.min(i, 6) * 50}>
              <Link
                href={`/reports/${r.id}`}
                className="card-hover group flex items-center justify-between rounded-2xl border border-border-subtle bg-background-card px-5 py-4"
              >
                <div>
                  <div className="font-medium">{r.scenario}</div>
                  <div className="mt-1 text-xs text-foreground-muted">
                    {new Date(r.startedAt).toLocaleString(lang === "en" ? "en-US" : "es-ES")} ·{" "}
                    {Math.round(r.durationMs / 1000)}s
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      color: bandColor[r.finalBand],
                      backgroundColor: `color-mix(in srgb, ${bandColor[r.finalBand]} 16%, transparent)`,
                    }}
                  >
                    {r.finalTrustScore}
                  </span>
                  <ChevronRightIcon className="h-4 w-4 text-foreground-muted transition-transform duration-300 group-hover:translate-x-0.5" />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
