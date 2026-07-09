"use client";

import { useRef, useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import {
  generateSyntheticReferenceBuffer,
  playAudioBuffer,
  recordMicClip,
} from "@/lib/audioForensics";
import { analyzeInWorker } from "@/lib/runAnalysisWorker";
import { VoiceFeatureSample } from "@/lib/types";
import { WaveformIcon } from "@/components/icons";
import { Tooltip } from "@/components/Tooltip";
import { Spectrogram } from "@/components/Spectrogram";

type Status = "idle" | "recording" | "analyzing" | "done" | "error";

interface SlotState {
  status: Status;
  buffer: AudioBuffer | null;
  result: VoiceFeatureSample | null;
  error: string | null;
}

const emptySlot: SlotState = { status: "idle", buffer: null, result: null, error: null };

function scoreColor(score: number) {
  if (score >= 55) return "var(--trust-danger)";
  if (score >= 30) return "var(--trust-caution)";
  return "var(--trust-safe)";
}

function MetricRow({
  label,
  value,
  suffix = "",
  hint,
}: {
  label: string;
  value: string;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-foreground-muted">
        {hint ? <Tooltip text={hint}>{label}</Tooltip> : label}
      </span>
      <span className="tabular-nums font-medium">
        {value}
        {suffix}
      </span>
    </div>
  );
}

function ResultCard({
  title,
  description,
  slot,
  onPrimaryAction,
  primaryLabel,
  onPlay,
  disabled,
  lang,
}: {
  title: string;
  description: string;
  slot: SlotState;
  onPrimaryAction: () => void;
  primaryLabel: string;
  onPlay?: () => void;
  disabled?: boolean;
  lang: "en" | "es";
}) {
  return (
    <div className="card-hover rounded-2xl border border-border-subtle bg-background-card p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
        <WaveformIcon className="h-5 w-5 text-accent" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-foreground-muted">{description}</p>

      {slot.status === "done" && slot.result ? (
        <div className="mt-5">
          <div className="text-center">
            <div className="text-4xl font-bold tabular-nums" style={{ color: scoreColor(slot.result.syntheticProbability) }}>
              {slot.result.syntheticProbability}%
              <span className="ml-1 text-base font-normal text-foreground-muted">± {slot.result.confidenceRange}</span>
            </div>
            <div className="text-xs text-foreground-muted">
              {lang === "en" ? "estimated synthetic probability" : "probabilidad sintética estimada"}
            </div>
            {slot.result.voicedFrameRatio < 0.35 && (
              <div className="mt-2 text-[11px] text-trust-caution">
                {lang === "en"
                  ? "Low audio quality detected — background noise or a quiet mic may widen the margin of error."
                  : "Se detectó baja calidad de audio — el ruido de fondo o un micrófono bajo pueden ampliar el margen de error."}
              </div>
            )}
          </div>
          <div className="mt-4 space-y-1.5 rounded-xl bg-background-elevated p-3">
            <MetricRow
              label={lang === "en" ? "Pitch jitter" : "Jitter de tono"}
              value={slot.result.pitchJitterPct.toFixed(2)}
              suffix="%"
              hint={
                lang === "en"
                  ? "Frame-to-frame variation in pitch period. Real human voices always have a little; near-zero jitter is a synthetic tell."
                  : "Variación del período de tono entre cuadros. Las voces humanas siempre tienen algo; un jitter casi nulo es señal de síntesis."
              }
            />
            <MetricRow
              label={lang === "en" ? "Amplitude shimmer" : "Shimmer de amplitud"}
              value={slot.result.shimmerPct.toFixed(2)}
              suffix="%"
              hint={
                lang === "en"
                  ? "Frame-to-frame variation in loudness. Very low, mechanically-regular shimmer suggests a non-human source."
                  : "Variación del volumen entre cuadros. Un shimmer muy bajo y mecánicamente regular sugiere una fuente no humana."
              }
            />
            <MetricRow
              label={lang === "en" ? "Spectral flatness" : "Planitud espectral"}
              value={slot.result.spectralFlatness.toFixed(3)}
              hint={
                lang === "en"
                  ? "How 'peaky' vs. 'flat' the frequency spectrum is. Closer to 0 means tonal/formant-rich; closer to 1 means noise-like."
                  : "Qué tan 'pico' o 'plano' es el espectro de frecuencia. Cerca de 0 es tonal; cerca de 1 es como ruido."
              }
            />
            <MetricRow
              label={lang === "en" ? "Mean pitch" : "Tono medio"}
              value={Math.round(slot.result.meanPitchHz).toString()}
              suffix=" Hz"
            />
          </div>
          {slot.buffer && (
            <div className="mt-3">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-foreground-muted">
                {lang === "en" ? "Spectrogram" : "Espectrograma"}
              </div>
              <Spectrogram buffer={slot.buffer} />
            </div>
          )}
          <div className="mt-4 flex gap-2">
            {onPlay && (
              <button
                onClick={onPlay}
                className="btn-press flex-1 rounded-full border border-border-strong py-2 text-xs font-medium hover:bg-background-elevated"
              >
                {lang === "en" ? "Play back" : "Reproducir"}
              </button>
            )}
            <button
              onClick={onPrimaryAction}
              className="btn-press flex-1 rounded-full bg-accent-solid py-2 text-xs font-medium text-white hover:bg-accent-solid-hover"
            >
              {lang === "en" ? "Try again" : "Intentar de nuevo"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <button
            onClick={onPrimaryAction}
            disabled={disabled || slot.status === "recording" || slot.status === "analyzing"}
            className="btn-press w-full rounded-full bg-accent-solid py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 hover:bg-accent-solid-hover disabled:opacity-50 disabled:shadow-none"
          >
            {slot.status === "recording"
              ? lang === "en" ? "Recording…" : "Grabando…"
              : slot.status === "analyzing"
              ? lang === "en" ? "Analyzing…" : "Analizando…"
              : primaryLabel}
          </button>
          {slot.status === "analyzing" && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-background-elevated">
              <div className="h-full w-1/3 animate-[progress-sweep_1.1s_ease-in-out_infinite] rounded-full bg-accent" />
            </div>
          )}
          {slot.status === "error" && slot.error && (
            <p className="mt-2 text-xs text-trust-danger">{slot.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function DemoPage() {
  const { settings } = useSettings();
  const lang = settings.language;
  const [yourVoice, setYourVoice] = useState<SlotState>(emptySlot);
  const [synthetic, setSynthetic] = useState<SlotState>(emptySlot);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleRecord() {
    setYourVoice({ ...emptySlot, status: "recording" });
    try {
      const buffer = await recordMicClip(3500);
      setYourVoice((s) => ({ ...s, status: "analyzing", buffer }));
      const result = await analyzeInWorker(buffer.getChannelData(0), buffer.sampleRate);
      setYourVoice({ status: "done", buffer, result, error: null });
    } catch {
      setYourVoice({
        ...emptySlot,
        status: "error",
        error:
          lang === "en"
            ? "Microphone access was blocked. Allow microphone permission, or upload a clip instead."
            : "Se bloqueó el acceso al micrófono. Permite el acceso, o sube un archivo de audio.",
      });
    }
  }

  async function handleUploadFile(file: File) {
    setYourVoice({ ...emptySlot, status: "analyzing" });
    try {
      const arrayBuffer = await file.arrayBuffer();
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      await ctx.close();
      setYourVoice((s) => ({ ...s, status: "analyzing", buffer }));
      const result = await analyzeInWorker(buffer.getChannelData(0), buffer.sampleRate);
      setYourVoice({ status: "done", buffer, result, error: null });
    } catch {
      setYourVoice({
        ...emptySlot,
        status: "error",
        error: lang === "en" ? "Couldn't decode that audio file." : "No se pudo decodificar ese archivo de audio.",
      });
    }
  }

  async function handleGenerateSynthetic() {
    setSynthetic({ ...emptySlot, status: "analyzing" });
    try {
      const buffer = await generateSyntheticReferenceBuffer(3);
      const result = await analyzeInWorker(buffer.getChannelData(0), buffer.sampleRate);
      setSynthetic({ status: "done", buffer, result, error: null });
      playAudioBuffer(buffer).catch(() => {});
    } catch {
      setSynthetic({
        ...emptySlot,
        status: "error",
        error: lang === "en" ? "This browser couldn't generate the reference sample." : "Este navegador no pudo generar la muestra de referencia.",
      });
    }
  }

  const bothDone = yourVoice.status === "done" && synthetic.status === "done" && yourVoice.result && synthetic.result;
  const gap = bothDone ? synthetic.result!.syntheticProbability - yourVoice.result!.syntheticProbability : 0;

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {lang === "en" ? "See it catch a cloned voice" : "Míralo detectar una voz clonada"}
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          {lang === "en"
            ? "This runs the same real audio-forensics engine used in the Live Monitor — pitch jitter, amplitude shimmer, and spectral flatness — entirely in your browser. Record a few seconds of your own voice, then generate a synthetic reference sample engineered to exhibit the acoustic fingerprints of AI-generated speech (near-perfect pitch stability, a mechanically regular amplitude envelope). Watch the scores diverge."
            : "Esto ejecuta el mismo motor real de análisis forense de audio usado en el Monitor en vivo — jitter de tono, shimmer de amplitud y planitud espectral — completamente en tu navegador. Graba unos segundos de tu voz y luego genera una muestra sintética de referencia diseñada para mostrar las características acústicas del habla generada por IA. Observa cómo divergen las puntuaciones."}
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <ResultCard
            title={lang === "en" ? "Your voice" : "Tu voz"}
            description={
              lang === "en"
                ? "Record ~3.5 seconds of yourself speaking naturally."
                : "Graba unos 3.5 segundos hablando con naturalidad."
            }
            slot={yourVoice}
            onPrimaryAction={handleRecord}
            primaryLabel={lang === "en" ? "Record my voice" : "Grabar mi voz"}
            onPlay={yourVoice.buffer ? () => playAudioBuffer(yourVoice.buffer!) : undefined}
            lang={lang}
          />
          <div className="mt-2 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadFile(file);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-foreground-muted underline hover:text-foreground"
            >
              {lang === "en" ? "or upload an audio clip instead" : "o sube un archivo de audio"}
            </button>
          </div>
        </div>

        <ResultCard
          title={lang === "en" ? "Synthetic reference sample" : "Muestra sintética de referencia"}
          description={
            lang === "en"
              ? "Procedurally generated with near-zero pitch jitter and a flat spectral envelope — the acoustic signature our forensics module looks for."
              : "Generada de forma procedimental con jitter de tono casi nulo y un espectro plano — la firma acústica que busca nuestro módulo forense."
          }
          slot={synthetic}
          onPrimaryAction={handleGenerateSynthetic}
          primaryLabel={lang === "en" ? "Generate & play" : "Generar y reproducir"}
          onPlay={synthetic.buffer ? () => playAudioBuffer(synthetic.buffer!) : undefined}
          lang={lang}
        />
      </div>

      {bothDone && (
        <div className="animate-fade-in-up mt-8 rounded-2xl border border-border-subtle bg-background-card p-6 text-center">
          <div className="text-sm font-semibold">
            {lang === "en" ? "Comparison" : "Comparación"}
          </div>
          <p className="mt-2 text-sm text-foreground-muted">
            {lang === "en"
              ? `The synthetic reference scored ${gap >= 0 ? "+" : ""}${Math.round(gap)} points higher on synthetic probability than your live recording — driven almost entirely by near-zero pitch jitter, the clearest tell of a non-human voice source.`
              : `La muestra sintética obtuvo ${gap >= 0 ? "+" : ""}${Math.round(gap)} puntos más en probabilidad sintética que tu grabación en vivo — impulsado casi por completo por un jitter de tono casi nulo, la señal más clara de una fuente de voz no humana.`}
          </p>
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-border-subtle bg-background-elevated/40 p-5 text-xs leading-relaxed text-foreground-muted">
        {lang === "en"
          ? "Honest framing: this reference sample is a procedurally generated test signal engineered to exhibit synthetic-speech acoustic properties — not a clone of a specific person's voice. It exists to demonstrate the forensics engine's real signal processing (autocorrelation-based pitch tracking, an in-house FFT for spectral analysis) against genuinely analyzable audio, without depending on a third-party voice-cloning model."
          : "Marco honesto: esta muestra de referencia es una señal de prueba generada de forma procedimental, diseñada para mostrar propiedades acústicas del habla sintética — no es una clonación de la voz de una persona específica. Existe para demostrar el procesamiento de señal real del motor forense sobre audio genuinamente analizable, sin depender de un modelo externo de clonación de voz."}
      </div>
    </div>
  );
}
