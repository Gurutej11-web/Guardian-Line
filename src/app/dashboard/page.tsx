"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { TrustMeter } from "@/components/TrustMeter";
import { TranscriptView } from "@/components/TranscriptView";
import { ExplainabilityPanel } from "@/components/ExplainabilityPanel";
import { BreakTheSpellBanner } from "@/components/BreakTheSpellBanner";
import { SafeWordModal } from "@/components/SafeWordModal";
import { FamilyCircleAlert } from "@/components/FamilyCircleAlert";
import { PhoneIcon, WaveformIcon } from "@/components/icons";
import { AudioLevelBars } from "@/components/AudioLevelBars";
import { LiveMicCapture } from "@/lib/audioForensics";
import { LiveTranscriber, isLiveTranscriptionSupported } from "@/lib/transcription";
import { classifyText, scoreTranscriptRisk, toRiskSpans, CategoryMatch } from "@/lib/scamClassifier";
import {
  computeTrustSnapshot,
  generateSpeakerConsistencyFlag,
  generateTranscriptFlags,
  generateVoiceAuthFlag,
  pickBreakTheSpellSuggestion,
} from "@/lib/fusionEngine";
import { demoScenarios } from "@/lib/demoScenarios";
import { saveReport } from "@/lib/storage";
import {
  CallReport,
  RiskFlag,
  TranscriptEntry,
  TrustSnapshot,
  VoiceFeatureSample,
} from "@/lib/types";

type Mode = "idle" | "live-mic" | "scripted";

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

const initialSnapshot: TrustSnapshot = {
  timestampMs: 0,
  trustScore: 100,
  voiceAuthScore: 0,
  transcriptRiskScore: 0,
  band: "safe",
};

/** Every field the end-of-call report is built from lives here, kept in
 * sync with React state at every write. The scripted-demo timeouts and
 * live-mic callbacks are scheduled once, so any value read only from
 * component state inside `endCall` would be a stale closure snapshot
 * from the render that started the call — this ref is the single
 * source of truth `endCall` reads from instead. */
interface SessionData {
  mode: Mode;
  scenarioId: string;
  flags: RiskFlag[];
  transcript: TranscriptEntry[];
  trustHistory: TrustSnapshot[];
  voiceSamples: VoiceFeatureSample[];
  snapshot: TrustSnapshot;
  safeWordChallenged: boolean;
  safeWordPassed: boolean | null;
  lastAnnouncedBand: TrustSnapshot["band"] | null;
}

function emptySession(mode: Mode, scenarioId: string): SessionData {
  return {
    mode,
    scenarioId,
    flags: [],
    transcript: [],
    trustHistory: [],
    voiceSamples: [],
    snapshot: initialSnapshot,
    safeWordChallenged: false,
    safeWordPassed: null,
    lastAnnouncedBand: null,
  };
}

/** Calm-mode voice guidance: speaks band transitions aloud for anyone
 * who can't look at the screen mid-call. Deliberately terse and only
 * fires on a genuine state change, not on every score tick, so it
 * reads as guidance rather than a stream of noise. */
function speakCalmAlert(band: TrustSnapshot["band"], lang: "en" | "es") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const phrases: Record<TrustSnapshot["band"], { en: string; es: string }> = {
    safe: { en: "This call still looks safe.", es: "Esta llamada todavía parece segura." },
    caution: { en: "Stay alert. Something about this call looks risky.", es: "Mantente alerta. Algo en esta llamada parece riesgoso." },
    danger: { en: "High risk detected. Consider hanging up and calling back on a known number.", es: "Riesgo alto detectado. Considera colgar y volver a llamar a un número conocido." },
  };
  const utter = new SpeechSynthesisUtterance(phrases[band][lang]);
  utter.lang = lang === "en" ? "en-US" : "es-ES";
  utter.rate = 0.95;
  window.speechSynthesis.speak(utter);
}

export default function DashboardPage() {
  const { settings, updateSettings, strings } = useSettings();
  const { showToast } = useToast();
  const router = useRouter();
  const lang = settings.language;

  const [mode, setMode] = useState<Mode>("idle");
  const [scenarioId, setScenarioId] = useState(demoScenarios[0].id);
  const [speakAloud, setSpeakAloud] = useState(true);
  const [callActive, setCallActive] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [micReady, setMicReady] = useState(false);

  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [flags, setFlags] = useState<RiskFlag[]>([]);
  const [snapshot, setSnapshot] = useState<TrustSnapshot>(initialSnapshot);

  const [safeWordModalOpen, setSafeWordModalOpen] = useState(false);
  const [familyAlertVisible, setFamilyAlertVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const pausedAccumRef = useRef(0);
  const pauseStartRef = useRef(0);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const familyAlertShownRef = useRef(false);

  const sessionRef = useRef<SessionData>(emptySession("idle", demoScenarios[0].id));
  const startTimeRef = useRef(0);
  const voiceAuthRef = useRef(0);
  const transcriptRiskRef = useRef(0);
  const recentMatchesRef = useRef<{ match: CategoryMatch; atMs: number }[]>([]);
  const baselineSampleRef = useRef<VoiceFeatureSample | null>(null);
  const micCaptureRef = useRef<LiveMicCapture | null>(null);
  const transcriberRef = useRef<LiveTranscriber | null>(null);
  const interimEntryIdRef = useRef<string | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      stopEverything();
    };
    // stopEverything only closes over refs, not state, so it never goes
    // stale between renders — safe to omit from the dependency array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the tab closed or crashed mid-call last time, the "in progress"
  // flag never got cleared — let the user know their previous session
  // wasn't cleanly saved, rather than silently losing it without a trace.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem("guardianline.callInProgress") === "1") {
      showToast(
        lang === "en"
          ? "Your previous call session was interrupted before it could be saved."
          : "Tu sesión de llamada anterior se interrumpió antes de poder guardarse.",
        "danger"
      );
      window.sessionStorage.removeItem("guardianline.callInProgress");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts: Space ends the active call, Escape dismisses the
  // Safe Word prompt. Ignored while focus is in a text field so typing
  // isn't hijacked.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (isTyping) return;
      if (e.code === "Space" && callActive) {
        e.preventDefault();
        endCall();
      } else if (e.key === "Escape" && safeWordModalOpen) {
        setSafeWordModalOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callActive, safeWordModalOpen]);

  function computeElapsed(): number {
    // While paused, freeze at the moment pause started rather than
    // continuing to tick — pausedAccumRef only accounts for *past*
    // pauses, not the one currently in progress.
    const now = pausedRef.current ? pauseStartRef.current : Date.now();
    return now - startTimeRef.current - pausedAccumRef.current;
  }

  async function acquireWakeLock() {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
      wakeLockRef.current = (await nav.wakeLock?.request("screen")) ?? null;
    } catch {
      wakeLockRef.current = null;
    }
  }

  function releaseWakeLock() {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }

  function togglePause() {
    setPaused((p) => {
      const next = !p;
      pausedRef.current = next;
      if (next) {
        pauseStartRef.current = Date.now();
      } else {
        pausedAccumRef.current += Date.now() - pauseStartRef.current;
      }
      return next;
    });
  }

  function stopEverything() {
    micCaptureRef.current?.stop();
    micCaptureRef.current = null;
    transcriberRef.current?.stop();
    transcriberRef.current = null;
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    if (tickerRef.current) clearInterval(tickerRef.current);
    tickerRef.current = null;
    window.speechSynthesis?.cancel();
    releaseWakeLock();
  }

  function resetSessionState(nextMode: Mode, nextScenarioId: string) {
    sessionRef.current = emptySession(nextMode, nextScenarioId);
    setTranscript([]);
    setFlags([]);
    setSnapshot(initialSnapshot);
    setSafeWordModalOpen(false);
    setFamilyAlertVisible(false);
    familyAlertShownRef.current = false;
    voiceAuthRef.current = 0;
    transcriptRiskRef.current = 0;
    recentMatchesRef.current = [];
    baselineSampleRef.current = null;
    interimEntryIdRef.current = null;
    setMicError(null);
    setMicReady(false);
    setPaused(false);
    pausedRef.current = false;
    pausedAccumRef.current = 0;
    pauseStartRef.current = 0;
  }

  function pushFlags(newFlags: RiskFlag[]) {
    if (newFlags.length === 0) return;
    sessionRef.current.flags = [...sessionRef.current.flags, ...newFlags];
    setFlags(sessionRef.current.flags);
  }

  function setTranscriptEntries(list: TranscriptEntry[]) {
    sessionRef.current.transcript = list;
    setTranscript(list);
  }

  function pushVoiceSample(sample: VoiceFeatureSample) {
    sessionRef.current.voiceSamples = [...sessionRef.current.voiceSamples, sample];
  }

  function updateFusion(nowMs: number) {
    const newSnapshot = computeTrustSnapshot(
      voiceAuthRef.current,
      transcriptRiskRef.current,
      settings.sensitivity,
      nowMs
    );
    sessionRef.current.snapshot = newSnapshot;
    sessionRef.current.trustHistory = [...sessionRef.current.trustHistory, newSnapshot];
    setSnapshot(newSnapshot);

    if (newSnapshot.band === "danger") {
      const hasSafeWord = settings.safeWords.length > 0 || !!settings.safeWord;
      if (hasSafeWord && !sessionRef.current.safeWordChallenged) {
        sessionRef.current.safeWordChallenged = true;
        setSafeWordModalOpen(true);
      }
      if (settings.familyCircleEnabled && settings.familyContacts.length > 0 && !familyAlertShownRef.current) {
        familyAlertShownRef.current = true;
        setFamilyAlertVisible(true);
        setTimeout(() => setFamilyAlertVisible(false), 6000);
      }
    }

    if (settings.calmVoiceGuidance && newSnapshot.band !== sessionRef.current.lastAnnouncedBand) {
      sessionRef.current.lastAnnouncedBand = newSnapshot.band;
      speakCalmAlert(newSnapshot.band, lang);
    }
  }

  function classifyAndFlag(text: string, timestampMs: number): CategoryMatch[] {
    const matches = classifyText(text, lang);
    matches.forEach((m) => recentMatchesRef.current.push({ match: m, atMs: timestampMs }));
    recentMatchesRef.current = recentMatchesRef.current.filter((r) => timestampMs - r.atMs < 45000);
    transcriptRiskRef.current = scoreTranscriptRisk(recentMatchesRef.current.map((r) => r.match));
    if (matches.length > 0) {
      pushFlags(generateTranscriptFlags(matches, timestampMs, lang));
    }
    return matches;
  }

  // ---------- Live mic mode ----------
  async function startLiveMic() {
    resetSessionState("live-mic", scenarioId);
    setMode("live-mic");
    setCallActive(true);
    window.sessionStorage.setItem("guardianline.callInProgress", "1");
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    tickerRef.current = setInterval(
      () => setElapsedMs(computeElapsed()),
      500
    );
    acquireWakeLock();

    if (!isLiveTranscriptionSupported()) {
      setMicError(
        lang === "en"
          ? "Live transcription isn't supported in this browser. Try Chrome, or use the Scripted Demo Call instead."
          : "La transcripción en vivo no es compatible con este navegador. Prueba Chrome, o usa la Llamada de demostración."
      );
    }

    const capture = new LiveMicCapture();
    micCaptureRef.current = capture;
    try {
      await capture.start((sample) => {
        if (pausedRef.current) return;
        pushVoiceSample(sample);
        voiceAuthRef.current = sample.syntheticProbability;
        if (!baselineSampleRef.current) baselineSampleRef.current = sample;
        else {
          const flag = generateSpeakerConsistencyFlag(baselineSampleRef.current, sample, lang);
          if (flag) pushFlags([flag]);
        }
        const voiceFlag = generateVoiceAuthFlag(sample, settings.sensitivity, lang);
        if (voiceFlag) pushFlags([voiceFlag]);
        updateFusion(sample.timestampMs);
      }, startTimeRef.current);
      setMicReady(true);
    } catch {
      setMicError(
        lang === "en"
          ? "Microphone access was blocked. Please allow microphone permission and try again."
          : "Se bloqueó el acceso al micrófono. Permite el acceso e inténtalo de nuevo."
      );
    }

    const transcriber = new LiveTranscriber();
    transcriberRef.current = transcriber;
    transcriber.start(
      lang,
      (text, isFinal, timestampMs) => {
        if (pausedRef.current) return;
        const list = [...sessionRef.current.transcript];
        if (!isFinal) {
          if (interimEntryIdRef.current) {
            const idx = list.findIndex((e) => e.id === interimEntryIdRef.current);
            if (idx >= 0) {
              list[idx] = { ...list[idx], text, timestampMs };
              setTranscriptEntries(list);
              return;
            }
          }
          const id = newId("t");
          interimEntryIdRef.current = id;
          list.push({ id, timestampMs, speaker: "caller", text, riskSpans: [], isFinal: false });
          setTranscriptEntries(list);
          return;
        }

        const matches = classifyAndFlag(text, timestampMs);
        const id = interimEntryIdRef.current ?? newId("t");
        interimEntryIdRef.current = null;
        const idx = list.findIndex((e) => e.id === id);
        const entry: TranscriptEntry = {
          id,
          timestampMs,
          speaker: "caller",
          text,
          riskSpans: toRiskSpans(matches),
          isFinal: true,
        };
        if (idx >= 0) list[idx] = entry;
        else list.push(entry);
        setTranscriptEntries(list);
        updateFusion(timestampMs);
      },
      (message) => setMicError(message)
    );
  }

  // ---------- Scripted demo mode ----------
  function startScriptedDemo() {
    resetSessionState("scripted", scenarioId);
    const scenario = demoScenarios.find((s) => s.id === scenarioId) ?? demoScenarios[0];
    setMode("scripted");
    setCallActive(true);
    window.sessionStorage.setItem("guardianline.callInProgress", "1");
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    tickerRef.current = setInterval(
      () => setElapsedMs(computeElapsed()),
      500
    );
    acquireWakeLock();

    scenario.lines.forEach((line) => {
      const timeout = setTimeout(() => {
        if (pausedRef.current) return;
        const entryId = newId("t");
        const text = line.text[lang];

        if (speakAloud && typeof window !== "undefined" && window.speechSynthesis) {
          const utter = new SpeechSynthesisUtterance(text);
          utter.lang = lang === "en" ? "en-US" : "es-ES";
          utter.rate = 1.02;
          window.speechSynthesis.speak(utter);
        }

        const matches = classifyAndFlag(text, line.atMs);

        setTranscriptEntries([
          ...sessionRef.current.transcript,
          {
            id: entryId,
            timestampMs: line.atMs,
            speaker: line.speaker,
            text,
            riskSpans: toRiskSpans(matches),
            isFinal: true,
          },
        ]);

        if (line.speaker === "caller" && typeof line.simulatedSyntheticProbability === "number") {
          const sample: VoiceFeatureSample = {
            timestampMs: line.atMs,
            syntheticProbability: line.simulatedSyntheticProbability,
            confidenceRange: 6,
            pitchJitterPct: Math.max(0.1, 1.4 - line.simulatedSyntheticProbability / 60),
            shimmerPct: Math.max(0.5, 4.2 - line.simulatedSyntheticProbability / 20),
            spectralFlatness: 0.15 + line.simulatedSyntheticProbability / 400,
            meanPitchHz: 145,
            voicedFrameRatio: 0.7,
          };
          pushVoiceSample(sample);
          voiceAuthRef.current = sample.syntheticProbability;
          if (!baselineSampleRef.current) baselineSampleRef.current = sample;
          const voiceFlag = generateVoiceAuthFlag(sample, settings.sensitivity, lang);
          if (voiceFlag) pushFlags([voiceFlag]);
        }

        updateFusion(line.atMs);
      }, line.atMs);
      timeoutsRef.current.push(timeout);
    });

    const lastLine = scenario.lines[scenario.lines.length - 1];
    const endTimeout = setTimeout(() => {
      endCall();
    }, lastLine.atMs + 4500);
    timeoutsRef.current.push(endTimeout);
  }

  function endCall() {
    stopEverything();
    setCallActive(false);
    window.sessionStorage.removeItem("guardianline.callInProgress");
    const session = sessionRef.current;

    const report: CallReport = {
      id: newId("report"),
      startedAt: new Date(startTimeRef.current).toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - startTimeRef.current,
      scenario:
        session.mode === "scripted"
          ? demoScenarios.find((s) => s.id === session.scenarioId)?.name[lang] ?? "Scripted demo"
          : lang === "en"
          ? "Live microphone session"
          : "Sesión de micrófono en vivo",
      finalTrustScore: session.snapshot.trustScore,
      finalBand: session.snapshot.band,
      flags: session.flags,
      transcript: session.transcript,
      trustHistory: session.trustHistory,
      voiceSamples: session.voiceSamples,
      safeWordChallenged: session.safeWordChallenged,
      safeWordPassed: session.safeWordPassed,
      tags: [],
      notes: "",
      feedback: null,
    };
    saveReport(report);
    setMode("idle");
    const navigate = () => router.push(`/reports/${report.id}`);
    const docWithTransition = document as Document & { startViewTransition?: (cb: () => void) => void };
    if (docWithTransition.startViewTransition) {
      docWithTransition.startViewTransition(navigate);
    } else {
      navigate();
    }
  }

  const suggestion = pickBreakTheSpellSuggestion(lang, Math.floor(elapsedMs / 1000));
  const elapsedLabel = `${Math.floor(elapsedMs / 60000)}:${Math.floor((elapsedMs / 1000) % 60)
    .toString()
    .padStart(2, "0")}`;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
      {!callActive ? (
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">{strings.nav.dashboard}</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            {lang === "en"
              ? "Choose how you'd like to try Guardian Line. Voice analysis always runs on-device."
              : "Elige cómo quieres probar Guardian Line. El análisis de voz siempre se ejecuta en el dispositivo."}
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setMode("live-mic")}
              className={`card-hover rounded-2xl border p-5 text-left ${
                mode === "live-mic" ? "border-accent bg-accent/10" : "border-border-subtle bg-background-card"
              }`}
            >
              <WaveformIcon className="h-6 w-6 text-accent" />
              <div className="mt-3 font-semibold">{lang === "en" ? "Live microphone" : "Micrófono en vivo"}</div>
              <p className="mt-1 text-xs text-foreground-muted">
                {lang === "en"
                  ? "Speak into your mic — real forensics + live transcription."
                  : "Habla por tu micrófono — análisis real + transcripción en vivo."}
              </p>
            </button>
            <button
              onClick={() => setMode("scripted")}
              className={`card-hover rounded-2xl border p-5 text-left ${
                mode === "scripted" ? "border-accent bg-accent/10" : "border-border-subtle bg-background-card"
              }`}
            >
              <PhoneIcon className="h-6 w-6 text-accent" />
              <div className="mt-3 font-semibold">{lang === "en" ? "Scripted demo call" : "Llamada de demostración"}</div>
              <p className="mt-1 text-xs text-foreground-muted">
                {lang === "en"
                  ? "Reliable, repeatable scam-call playback for demos."
                  : "Reproducción confiable y repetible de una llamada de estafa."}
              </p>
            </button>
          </div>

          {mode === "scripted" && (
            <div className="mt-6 space-y-3">
              {demoScenarios.map((s) => (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                    scenarioId === s.id ? "border-accent bg-accent/5" : "border-border-subtle"
                  }`}
                >
                  <input
                    type="radio"
                    name="scenario"
                    className="mt-1"
                    checked={scenarioId === s.id}
                    onChange={() => setScenarioId(s.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{s.name[lang]}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          color: s.riskLevel === "benign" ? "var(--trust-safe)" : "var(--trust-danger)",
                          backgroundColor: `color-mix(in srgb, ${s.riskLevel === "benign" ? "var(--trust-safe)" : "var(--trust-danger)"} 16%, transparent)`,
                        }}
                      >
                        {s.riskLevel === "benign"
                          ? lang === "en" ? "control" : "control"
                          : lang === "en" ? "high risk" : "alto riesgo"}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-foreground-muted">{s.description[lang]}</div>
                  </div>
                </label>
              ))}
              <label className="flex items-center gap-2 text-xs text-foreground-muted">
                <input type="checkbox" checked={speakAloud} onChange={(e) => setSpeakAloud(e.target.checked)} />
                {lang === "en" ? "Speak caller lines aloud" : "Reproducir las líneas en voz alta"}
              </label>
            </div>
          )}

          {mode !== "idle" && (
            <button
              onClick={mode === "live-mic" ? startLiveMic : startScriptedDemo}
              className="btn-press mt-8 w-full rounded-full bg-accent-solid py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 hover:bg-accent-solid-hover"
            >
              {lang === "en" ? "Start" : "Comenzar"}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="animate-fade-in-up flex items-center justify-between rounded-2xl border border-border-subtle bg-background-card px-5 py-3">
            <div className="flex items-center gap-2 text-sm">
              {paused ? (
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-trust-caution" />
              ) : (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-trust-danger opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-trust-danger" />
                </span>
              )}
              {paused
                ? lang === "en" ? "Paused" : "Pausado"
                : mode === "live-mic"
                ? lang === "en" ? "Live call" : "Llamada en vivo"
                : demoScenarios.find((s) => s.id === scenarioId)?.name[lang]}
              <span className="tabular-nums text-foreground-muted">{elapsedLabel}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={togglePause}
                className="btn-press rounded-full border border-border-strong px-4 py-1.5 text-sm font-semibold hover:bg-background-elevated"
              >
                {paused ? (lang === "en" ? "Resume" : "Reanudar") : (lang === "en" ? "Pause" : "Pausar")}
              </button>
              <button
                onClick={endCall}
                className="btn-press rounded-full bg-trust-danger px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
              >
                {lang === "en" ? "End call" : "Terminar llamada"}
              </button>
            </div>
          </div>

          {elapsedMs > 15 * 60 * 1000 && (
            <div className="animate-fade-in-up rounded-xl border border-trust-caution/40 bg-trust-caution/10 px-4 py-3 text-sm text-trust-caution">
              {lang === "en"
                ? "This call has run over 15 minutes. If anything about it still feels off, it's okay to end it."
                : "Esta llamada lleva más de 15 minutos. Si algo todavía te parece raro, está bien terminarla."}
            </div>
          )}

          {mode === "live-mic" && micReady && (
            <div className="animate-fade-in-up flex items-center gap-3 rounded-2xl border border-border-subtle bg-background-card px-5 py-3">
              <WaveformIcon className="h-4 w-4 shrink-0 text-accent" />
              <AudioLevelBars analyser={micCaptureRef.current?.getAnalyserNode() ?? null} className="flex-1" />
              <span className="shrink-0 text-xs text-foreground-muted">
                {lang === "en" ? "Listening" : "Escuchando"}
              </span>
            </div>
          )}

          {micError && (
            <div className="rounded-xl border border-trust-caution/40 bg-trust-caution/10 px-4 py-3 text-sm text-trust-caution">
              {micError}
            </div>
          )}

          {snapshot.band === "danger" && <BreakTheSpellBanner suggestion={suggestion} />}

          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] gap-5">
            <div className="flex flex-col gap-3">
              <div
                className="animate-fade-in-up flex items-center justify-center rounded-2xl border border-border-subtle bg-background-card p-5"
                style={{ animationDelay: "60ms" }}
              >
                <TrustMeter
                  trustScore={snapshot.trustScore}
                  band={snapshot.band}
                  voiceAuthScore={snapshot.voiceAuthScore}
                  transcriptRiskScore={snapshot.transcriptRiskScore}
                  size={200}
                />
              </div>
              <div
                className="animate-fade-in-up rounded-2xl border border-border-subtle bg-background-card p-4"
                style={{ animationDelay: "90ms" }}
              >
                <div className="flex items-center justify-between text-xs text-foreground-muted">
                  <span>{lang === "en" ? "Sensitivity" : "Sensibilidad"}</span>
                  <span className="tabular-nums">{settings.sensitivity}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.sensitivity}
                  onChange={(e) => updateSettings({ sensitivity: Number(e.target.value) })}
                  className="mt-1 w-full accent-[var(--accent)]"
                />
              </div>
            </div>

            <div
              className="animate-fade-in-up h-[420px] rounded-2xl border border-border-subtle bg-background-card p-5"
              style={{ animationDelay: "120ms" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground-muted">
                  {lang === "en" ? "Live transcript" : "Transcripción en vivo"}
                </h2>
                {mode === "scripted" && (
                  <span className="text-[10px] text-foreground-muted">
                    {lang === "en" ? "Wavy underlines = why it's risky" : "Subrayado ondulado = por qué es riesgoso"}
                  </span>
                )}
              </div>
              <div className="h-[calc(100%-2rem)]">
                <TranscriptView entries={transcript} />
              </div>
            </div>

            <div
              className="animate-fade-in-up h-[420px] rounded-2xl border border-border-subtle bg-background-card p-5"
              style={{ animationDelay: "180ms" }}
            >
              <h2 className="mb-3 text-sm font-semibold text-foreground-muted">
                {lang === "en" ? "Explainability" : "Explicabilidad"}
              </h2>
              <div className="h-[calc(100%-2rem)]">
                <ExplainabilityPanel flags={flags} />
              </div>
            </div>
          </div>
        </div>
      )}

      {safeWordModalOpen && (
        <SafeWordModal
          onResolve={(passed) => {
            sessionRef.current.safeWordPassed = passed;
            setSafeWordModalOpen(false);
          }}
          onSkip={() => setSafeWordModalOpen(false)}
        />
      )}
      {familyAlertVisible && (
        <FamilyCircleAlert contactNames={settings.familyContacts.map((c) => c.name)} />
      )}
    </div>
  );
}
