"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/context/SettingsContext";
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
  };
}

export default function DashboardPage() {
  const { settings, strings } = useSettings();
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
  }, []);

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
      if (settings.safeWord && !sessionRef.current.safeWordChallenged) {
        sessionRef.current.safeWordChallenged = true;
        setSafeWordModalOpen(true);
      }
      if (settings.familyCircleEnabled && settings.familyContacts.length > 0 && !familyAlertShownRef.current) {
        familyAlertShownRef.current = true;
        setFamilyAlertVisible(true);
        setTimeout(() => setFamilyAlertVisible(false), 6000);
      }
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
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    tickerRef.current = setInterval(() => setElapsedMs(Date.now() - startTimeRef.current), 500);

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
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    tickerRef.current = setInterval(() => setElapsedMs(Date.now() - startTimeRef.current), 500);

    scenario.lines.forEach((line) => {
      const timeout = setTimeout(() => {
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
    router.push(`/reports/${report.id}`);
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
                  <div>
                    <div className="text-sm font-medium">{s.name[lang]}</div>
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
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-trust-danger opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-trust-danger" />
              </span>
              {mode === "live-mic"
                ? lang === "en" ? "Live call" : "Llamada en vivo"
                : demoScenarios.find((s) => s.id === scenarioId)?.name[lang]}
              <span className="tabular-nums text-foreground-muted">{elapsedLabel}</span>
            </div>
            <button
              onClick={endCall}
              className="btn-press rounded-full bg-trust-danger px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
            >
              {lang === "en" ? "End call" : "Terminar llamada"}
            </button>
          </div>

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
              className="animate-fade-in-up h-[420px] rounded-2xl border border-border-subtle bg-background-card p-5"
              style={{ animationDelay: "120ms" }}
            >
              <h2 className="mb-3 text-sm font-semibold text-foreground-muted">
                {lang === "en" ? "Live transcript" : "Transcripción en vivo"}
              </h2>
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
        />
      )}
      {familyAlertVisible && (
        <FamilyCircleAlert contactNames={settings.familyContacts.map((c) => c.name)} />
      )}
    </div>
  );
}
