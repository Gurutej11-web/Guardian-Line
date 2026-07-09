"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSettings } from "@/context/SettingsContext";
import { getReport } from "@/lib/storage";
import { CallReport } from "@/lib/types";

const bandColor = {
  safe: "var(--trust-safe)",
  caution: "var(--trust-caution)",
  danger: "var(--trust-danger)",
} as const;

function overlayPath(values: number[], width: number, height: number) {
  if (values.length === 0) return "";
  const step = width / Math.max(1, values.length - 1);
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(height - (v / 100) * height).toFixed(1)}`)
    .join(" ");
}

function ReportColumn({ report, lang }: { report: CallReport | undefined; lang: "en" | "es" }) {
  if (!report) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-background-card p-6 text-center text-sm text-foreground-muted">
        {lang === "en" ? "Report not found." : "Informe no encontrado."}
      </div>
    );
  }
  const color = bandColor[report.finalBand];
  return (
    <div className="rounded-2xl border border-border-subtle bg-background-card p-6">
      <div className="text-sm font-medium">{report.scenario}</div>
      <div className="mt-1 text-xs text-foreground-muted">
        {new Date(report.startedAt).toLocaleString(lang === "en" ? "en-US" : "es-ES")}
      </div>
      <div className="mt-4 text-3xl font-bold tabular-nums" style={{ color }}>
        {report.finalTrustScore}
      </div>
      <div className="mt-3 space-y-1 text-xs text-foreground-muted">
        <div>{lang === "en" ? "Duration" : "Duración"}: {Math.round(report.durationMs / 1000)}s</div>
        <div>{lang === "en" ? "Flags" : "Alertas"}: {report.flags.length}</div>
        <div>
          {lang === "en" ? "Safe word" : "Palabra segura"}:{" "}
          {report.safeWordChallenged ? (report.safeWordPassed ? (lang === "en" ? "Passed" : "Aprobada") : (lang === "en" ? "Failed" : "Fallida")) : (lang === "en" ? "N/A" : "N/D")}
        </div>
      </div>
    </div>
  );
}

function CompareContent() {
  const params = useSearchParams();
  const { settings } = useSettings();
  const lang = settings.language;
  const [reportA, setReportA] = useState<CallReport | undefined>(undefined);
  const [reportB, setReportB] = useState<CallReport | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const idA = params.get("a");
    const idB = params.get("b");
    // localStorage is only available client-side, so this can't be a
    // lazy useState initializer without causing a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReportA(idA ? getReport(idA) : undefined);
    setReportB(idB ? getReport(idB) : undefined);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loaded) return null;

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
      <Link href="/reports" className="text-xs text-foreground-muted underline hover:text-foreground">
        ← {lang === "en" ? "Back to reports" : "Volver a informes"}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {lang === "en" ? "Compare calls" : "Comparar llamadas"}
      </h1>

      {reportA && reportB && (
        <div className="card-hover mt-6 rounded-2xl border border-border-subtle bg-background-card p-5">
          <div className="text-xs text-foreground-muted mb-2">
            {lang === "en" ? "Trust score over time (overlaid)" : "Puntuación de confianza en el tiempo (superpuesta)"}
          </div>
          <svg viewBox="0 0 300 60" className="w-full h-16" preserveAspectRatio="none">
            <path d={overlayPath(reportA.trustHistory.map((h) => h.trustScore), 300, 60)} fill="none" stroke={bandColor[reportA.finalBand]} strokeWidth={2} />
            <path d={overlayPath(reportB.trustHistory.map((h) => h.trustScore), 300, 60)} fill="none" stroke={bandColor[reportB.finalBand]} strokeWidth={2} strokeDasharray="4 3" />
          </svg>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <ReportColumn report={reportA} lang={lang} />
        <ReportColumn report={reportB} lang={lang} />
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <CompareContent />
    </Suspense>
  );
}
