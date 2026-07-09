"use client";

import { useEffect, useRef } from "react";
import { FlagCategory, TranscriptEntry } from "@/lib/types";
import { categoryLabels } from "@/lib/i18n";
import { useSettings } from "@/context/SettingsContext";

const categoryColor: Record<FlagCategory, string> = {
  "voice-authenticity": "var(--trust-caution)",
  "speaker-consistency": "var(--trust-caution)",
  urgency: "var(--trust-caution)",
  "financial-request": "var(--trust-danger)",
  isolation: "var(--trust-danger)",
  "authority-impersonation": "var(--trust-danger)",
  "emotional-manipulation": "var(--trust-caution)",
};

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function HighlightedText({ entry, lang }: { entry: TranscriptEntry; lang: "en" | "es" }) {
  const { text, riskSpans } = entry;
  if (!riskSpans.length) return <>{text}</>;

  // Different categories can match overlapping or identical substrings
  // (e.g. "don't hang up" matches both the urgency and isolation
  // patterns) — sorting alone doesn't dedupe that, so without clamping
  // each span to what's left after `cursor`, an overlapping span would
  // re-render text that a previous span already covered.
  const sorted = [...riskSpans].sort((a, b) => a.start - b.start || b.end - a.end);
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((span, i) => {
    if (span.end <= cursor) return; // fully covered by an earlier span
    const start = Math.max(span.start, cursor);
    if (start > cursor) parts.push(<span key={`t-${i}`}>{text.slice(cursor, start)}</span>);
    const color = categoryColor[span.category];
    parts.push(
      <mark
        key={`m-${i}`}
        title={categoryLabels[span.category][lang]}
        style={{
          backgroundColor: "transparent",
          color,
          textDecoration: "underline",
          textDecorationStyle: "wavy",
          textDecorationColor: color,
          textUnderlineOffset: "3px",
        }}
      >
        {text.slice(start, span.end)}
      </mark>
    );
    cursor = span.end;
  });
  if (cursor < text.length) parts.push(<span key="t-last">{text.slice(cursor)}</span>);
  return <>{parts}</>;
}

export function TranscriptView({ entries }: { entries: TranscriptEntry[] }) {
  const { settings } = useSettings();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-foreground-muted">
        {settings.language === "en"
          ? "Transcript will appear here once the call starts."
          : "La transcripción aparecerá aquí cuando comience la llamada."}
      </div>
    );
  }

  return (
    <div className="scrollbar-thin flex h-full flex-col gap-3 overflow-y-auto pr-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`animate-fade-in-up max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            entry.speaker === "caller"
              ? "self-start bg-background-elevated"
              : "self-end bg-accent/15"
          } ${entry.isFinal ? "" : "opacity-60"}`}
        >
          <div className="mb-1 text-[10px] uppercase tracking-wide text-foreground-muted">
            {entry.speaker === "caller"
              ? (settings.language === "en" ? "Caller" : "Quien llama")
              : (settings.language === "en" ? "You" : "Tú")}{" "}
            · {formatTime(entry.timestampMs)}
          </div>
          <HighlightedText entry={entry} lang={settings.language} />
          {!entry.isFinal && (
            <span className="animate-blink-cursor ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-foreground-muted" />
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
