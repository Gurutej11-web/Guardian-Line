export type Language = "en" | "es";

/** Language the *caller* is speaking, used only to select scam-phrase
 * patterns for the transcript classifier. Deliberately separate from
 * `Language` (the app's own display language) — a French- or
 * Vietnamese-speaking caller can be scored while the app UI stays in
 * English or Spanish, since only the interface has been translated. */
export type CallLanguage = "en" | "es" | "fr" | "zh" | "vi" | "tl";

export type Speaker = "caller" | "you";

export type FlagCategory =
  | "voice-authenticity"
  | "speaker-consistency"
  | "urgency"
  | "financial-request"
  | "isolation"
  | "authority-impersonation"
  | "emotional-manipulation";

export type Severity = "low" | "medium" | "high";

export type TrustBand = "safe" | "caution" | "danger";

export interface RiskFlag {
  id: string;
  timestampMs: number;
  category: FlagCategory;
  severity: Severity;
  message: string;
  sourceText?: string;
}

export interface RiskSpan {
  start: number;
  end: number;
  category: FlagCategory;
}

export interface TranscriptEntry {
  id: string;
  timestampMs: number;
  speaker: Speaker;
  text: string;
  riskSpans: RiskSpan[];
  isFinal: boolean;
}

export interface VoiceFeatureSample {
  timestampMs: number;
  syntheticProbability: number;
  /** ± spread around syntheticProbability, derived from how much the
   * underlying jitter/shimmer readings vary across the analysis window —
   * wider spread means less stable evidence, not a literal statistical
   * confidence interval. */
  confidenceRange: number;
  pitchJitterPct: number;
  shimmerPct: number;
  spectralFlatness: number;
  meanPitchHz: number;
  voicedFrameRatio: number;
}

export interface SpeakerConsistencyResult {
  shiftDetected: boolean;
  driftScore: number;
}

export interface TrustSnapshot {
  timestampMs: number;
  trustScore: number;
  voiceAuthScore: number;
  transcriptRiskScore: number;
  band: TrustBand;
}

export interface CallReport {
  id: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  scenario: string;
  finalTrustScore: number;
  finalBand: TrustBand;
  flags: RiskFlag[];
  transcript: TranscriptEntry[];
  trustHistory: TrustSnapshot[];
  voiceSamples: VoiceFeatureSample[];
  safeWordChallenged: boolean;
  safeWordPassed: boolean | null;
  tags: string[];
  notes: string;
  feedback: "helpful" | "not-helpful" | null;
  callLanguage: CallLanguage;
}

export interface FamilyContact {
  id: string;
  name: string;
  method: "sms" | "push" | "email";
  contactValue: string;
  notifyThreshold: "caution" | "danger";
}

export type Theme = "dark" | "light";
export type ColorMode = "standard" | "colorblind-safe";

export interface SafeWordEntry {
  id: string;
  label: string;
  phrase: string;
}

export interface VoiceBaseline {
  meanPitchHz: number;
  spectralFlatness: number;
  capturedAt: string;
}

/** A user-contributed scam phrase, shared and imported entirely as a
 * local JSON file — there's no server, so "community sharing" here
 * means exporting a file and sending it to someone else however you'd
 * like (email, USB drive, a shared folder). Deliberately holds only a
 * category/phrase/severity: no names, timestamps, or transcripts, so
 * exporting one never leaks anything about the call it came from. */
export interface CustomPattern {
  id: string;
  category: FlagCategory;
  phrase: string;
  severity: Severity;
}

export interface AppSettings {
  language: Language;
  /** Language the app listens for scam phrases in during a live call —
   * independent of `language` (the interface's own display language). */
  callLanguage: CallLanguage;
  sensitivity: number; // 0-100, higher = more sensitive (flags earlier)
  privacyMode: boolean; // on-device only, never "transmit" anonymized scores
  calmVoiceGuidance: boolean;
  highContrast: boolean;
  largeText: boolean;
  familyCircleEnabled: boolean;
  familyContacts: FamilyContact[];
  /** @deprecated use safeWords instead; kept only for reading old saved data */
  safeWord: string | null;
  safeWords: SafeWordEntry[];
  theme: Theme;
  colorMode: ColorMode;
  reducedTransparency: boolean;
  accentHue: string;
  dyslexiaFont: boolean;
  voiceBaseline: VoiceBaseline | null;
  llmApiKey: string;
  llmEndpoint: string;
  hasSeenOnboarding: boolean;
  sensitivityNudge: number;
  desktopNotifications: boolean;
}
