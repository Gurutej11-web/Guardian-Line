export type Language = "en" | "es";

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

export interface AppSettings {
  language: Language;
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
}
