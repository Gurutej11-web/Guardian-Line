"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { deleteReports, loadReports } from "@/lib/storage";
import { CallReport, TrustBand } from "@/lib/types";
import { ChevronRightIcon } from "@/components/icons";
import { Reveal } from "@/components/Reveal";
import { SkeletonReportCard } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";

const bandColor = {
  safe: "var(--trust-safe)",
  caution: "var(--trust-caution)",
  danger: "var(--trust-danger)",
} as const;

type SortMode = "newest" | "riskiest" | "longest";

function TrendChart({ reports, lang }: { reports: CallReport[]; lang: "en" | "es" }) {
  const points = [...reports]
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .slice(-14);
  if (points.length < 2) return null;

  const width = 300;
  const height = 50;
  const step = width / (points.length - 1);
  const path = points
    .map((r, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(height - (r.finalTrustScore / 100) * height).toFixed(1)}`)
    .join(" ");
  const avg = Math.round(points.reduce((sum, r) => sum + r.finalTrustScore, 0) / points.length);

  return (
    <div className="card-hover mb-6 rounded-2xl border border-border-subtle bg-background-card p-5">
      <div className="flex items-center justify-between text-xs text-foreground-muted">
        <span>{lang === "en" ? `Trust score trend (last ${points.length} calls)` : `Tendencia de confianza (últimas ${points.length} llamadas)`}</span>
        <span className="tabular-nums">{lang === "en" ? "avg " : "prom. "}{avg}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-12 w-full" preserveAspectRatio="none">
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} />
      </svg>
    </div>
  );
}

export default function ReportsPage() {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const lang = settings.language;
  const [reports, setReports] = useState<CallReport[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [bandFilter, setBandFilter] = useState<TrustBand | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    // localStorage is only available client-side, so this can't be a
    // lazy useState initializer without causing a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReports(loadReports());
    setLoaded(true);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = reports.filter((r) => {
      if (bandFilter !== "all" && r.finalBand !== bandFilter) return false;
      if (q && !r.scenario.toLowerCase().includes(q) && !r.tags.some((t) => t.toLowerCase().includes(q))) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortMode === "newest") return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      if (sortMode === "riskiest") return a.finalTrustScore - b.finalTrustScore;
      return b.durationMs - a.durationMs;
    });
    return list;
  }, [reports, search, bandFilter, sortMode]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(lang === "en" ? `Delete ${selected.size} report(s)?` : `¿Eliminar ${selected.size} informe(s)?`)) return;
    deleteReports([...selected]);
    setReports(loadReports());
    setSelected(new Set());
    setSelectMode(false);
    showToast(lang === "en" ? "Reports deleted" : "Informes eliminados", "success");
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{settings.language === "en" ? "Reports" : "Informes"}</h1>
        {reports.length > 0 && (
          <button
            onClick={() => {
              setSelectMode((s) => !s);
              setSelected(new Set());
            }}
            className="btn-press text-xs text-foreground-muted underline hover:text-foreground"
          >
            {selectMode ? (lang === "en" ? "Cancel" : "Cancelar") : (lang === "en" ? "Select" : "Seleccionar")}
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-foreground-muted">
        {lang === "en"
          ? "Post-call summaries are saved on this device only."
          : "Los resúmenes de llamadas se guardan solo en este dispositivo."}
      </p>

      {loaded && reports.length > 0 && <div className="mt-6"><TrendChart reports={reports} lang={lang} /></div>}

      {loaded && reports.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "en" ? "Search by scenario or tag…" : "Buscar por escenario o etiqueta…"}
            className="flex-1 rounded-full border border-border-subtle bg-background-elevated px-4 py-2 text-sm outline-none focus:border-accent"
          />
          <select
            value={bandFilter}
            onChange={(e) => setBandFilter(e.target.value as TrustBand | "all")}
            className="rounded-full border border-border-subtle bg-background-elevated px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="all">{lang === "en" ? "All risk levels" : "Todos los niveles"}</option>
            <option value="safe">{lang === "en" ? "Safe" : "Seguro"}</option>
            <option value="caution">{lang === "en" ? "Caution" : "Precaución"}</option>
            <option value="danger">{lang === "en" ? "Danger" : "Peligro"}</option>
          </select>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-full border border-border-subtle bg-background-elevated px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="newest">{lang === "en" ? "Newest" : "Más recientes"}</option>
            <option value="riskiest">{lang === "en" ? "Riskiest" : "Más riesgosos"}</option>
            <option value="longest">{lang === "en" ? "Longest" : "Más largos"}</option>
          </select>
        </div>
      )}

      {selectMode && selected.size > 0 && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleBulkDelete}
            className="btn-press rounded-full bg-trust-danger px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            {lang === "en" ? `Delete ${selected.size} selected` : `Eliminar ${selected.size} seleccionados`}
          </button>
          {selected.size === 2 && (
            <Link
              href={`/reports/compare?a=${[...selected][0]}&b=${[...selected][1]}`}
              className="btn-press rounded-full border border-border-strong px-4 py-2 text-xs font-semibold hover:bg-background-elevated"
            >
              {lang === "en" ? "Compare selected" : "Comparar seleccionados"}
            </Link>
          )}
        </div>
      )}

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
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-foreground-muted">
          {lang === "en" ? "No reports match your filters." : "Ningún informe coincide con tus filtros."}
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((r, i) => (
            <Reveal key={r.id} delayMs={Math.min(i, 6) * 50}>
              <div className="flex items-center gap-3">
                {selectMode && (
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleSelected(r.id)}
                    className="h-4 w-4 shrink-0"
                  />
                )}
                <Link
                  href={selectMode ? "#" : `/reports/${r.id}`}
                  onClick={(e) => {
                    if (selectMode) {
                      e.preventDefault();
                      toggleSelected(r.id);
                    }
                  }}
                  className="card-hover group flex flex-1 items-center justify-between rounded-2xl border border-border-subtle bg-background-card px-5 py-4"
                >
                  <div>
                    <div className="font-medium">{r.scenario}</div>
                    <div className="mt-1 text-xs text-foreground-muted">
                      {new Date(r.startedAt).toLocaleString(lang === "en" ? "en-US" : "es-ES")} ·{" "}
                      {Math.round(r.durationMs / 1000)}s
                      {r.tags.length > 0 && ` · ${r.tags.join(", ")}`}
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
                    {!selectMode && (
                      <ChevronRightIcon className="h-4 w-4 text-foreground-muted transition-transform duration-300 group-hover:translate-x-0.5" />
                    )}
                  </div>
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
