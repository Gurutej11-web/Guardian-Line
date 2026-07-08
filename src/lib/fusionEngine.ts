import { checkSpeakerConsistency } from "./audioForensics";
import { categoryLabels } from "./i18n";
import { CategoryMatch } from "./scamClassifier";
import {
  Language,
  RiskFlag,
  Severity,
  TrustBand,
  TrustSnapshot,
  VoiceFeatureSample,
} from "./types";

/**
 * Fusion engine: combines the independent voice-authenticity signal and
 * the conversational-risk signal into one explainable Trust Meter
 * reading. Weighted so either signal alone can raise a warning, but the
 * two together escalate severity faster than either would in isolation.
 */

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export function computeCombinedRisk(voiceAuthScore: number, transcriptRiskScore: number): number {
  const hi = Math.max(voiceAuthScore, transcriptRiskScore);
  const lo = Math.min(voiceAuthScore, transcriptRiskScore);
  return clamp(hi * 0.6 + lo * 0.4, 0, 100);
}

/** Sensitivity is 0-100 (from the settings slider). Higher sensitivity
 * lowers the thresholds so flags fire earlier / more readily. */
export function bandForRisk(combinedRisk: number, sensitivity: number): TrustBand {
  const shift = (sensitivity - 50) * 0.3;
  const dangerThreshold = 65 - shift;
  const cautionThreshold = 32 - shift * 0.6;
  if (combinedRisk >= dangerThreshold) return "danger";
  if (combinedRisk >= cautionThreshold) return "caution";
  return "safe";
}

export function computeTrustSnapshot(
  voiceAuthScore: number,
  transcriptRiskScore: number,
  sensitivity: number,
  timestampMs: number
): TrustSnapshot {
  const combinedRisk = computeCombinedRisk(voiceAuthScore, transcriptRiskScore);
  return {
    timestampMs,
    trustScore: Math.round(100 - combinedRisk),
    voiceAuthScore: Math.round(voiceAuthScore),
    transcriptRiskScore: Math.round(transcriptRiskScore),
    band: bandForRisk(combinedRisk, sensitivity),
  };
}

let flagCounter = 0;
function nextId() {
  flagCounter += 1;
  return `flag-${Date.now()}-${flagCounter}`;
}

function severityFromScore(score: number): Severity {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export function generateVoiceAuthFlag(
  sample: VoiceFeatureSample,
  sensitivity: number,
  lang: Language
): RiskFlag | null {
  const threshold = 55 - (sensitivity - 50) * 0.25;
  if (sample.syntheticProbability < threshold) return null;
  const desc = categoryLabels["voice-authenticity"].description[lang];
  const secs = (sample.timestampMs / 1000).toFixed(0);
  return {
    id: nextId(),
    timestampMs: sample.timestampMs,
    category: "voice-authenticity",
    severity: severityFromScore(sample.syntheticProbability),
    message: `${desc} (${sample.syntheticProbability}% synthetic) — ${secs}s`,
  };
}

export function generateSpeakerConsistencyFlag(
  baseline: VoiceFeatureSample,
  current: VoiceFeatureSample,
  lang: Language
): RiskFlag | null {
  const result = checkSpeakerConsistency(baseline, current);
  if (!result.shiftDetected) return null;
  const desc = categoryLabels["speaker-consistency"].description[lang];
  const secs = (current.timestampMs / 1000).toFixed(0);
  return {
    id: nextId(),
    timestampMs: current.timestampMs,
    category: "speaker-consistency",
    severity: result.driftScore > 0.55 ? "high" : "medium",
    message: `${desc} — ${secs}s`,
  };
}

export function generateTranscriptFlags(
  matches: CategoryMatch[],
  timestampMs: number,
  lang: Language
): RiskFlag[] {
  return matches.map((m) => {
    const desc = categoryLabels[m.category].description[lang];
    const secs = (timestampMs / 1000).toFixed(0);
    return {
      id: nextId(),
      timestampMs,
      category: m.category,
      severity: m.severity,
      message: `${desc}: "${m.phrase}" — ${secs}s`,
      sourceText: m.phrase,
    };
  });
}

export const breakTheSpellSuggestions: Record<Language, string[]> = {
  en: [
    "Hang up and call them back on a number you already have saved.",
    "Ask a question only the real person would know the answer to.",
    "Tell them you need to verify with a family member before doing anything.",
    "Never send gift cards, wire transfers, or crypto based on a phone call alone.",
  ],
  es: [
    "Cuelga y devuelve la llamada a un número que ya tengas guardado.",
    "Haz una pregunta que solo la persona real sabría responder.",
    "Diles que necesitas verificar con un familiar antes de hacer algo.",
    "Nunca envíes tarjetas de regalo, transferencias o cripto solo por una llamada.",
  ],
};

export function pickBreakTheSpellSuggestion(lang: Language, seed: number): string {
  const list = breakTheSpellSuggestions[lang];
  return list[seed % list.length];
}
