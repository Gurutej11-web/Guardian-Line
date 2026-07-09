import { AppSettings, CallReport, CustomPattern } from "./types";

const SETTINGS_KEY = "guardianline.settings.v1";
const REPORTS_KEY = "guardianline.reports.v1";
const CUSTOM_PATTERNS_KEY = "guardianline.customPatterns.v1";

export const defaultSettings: AppSettings = {
  language: "en",
  callLanguage: "en",
  sensitivity: 50,
  privacyMode: true,
  calmVoiceGuidance: false,
  highContrast: false,
  largeText: false,
  familyCircleEnabled: false,
  familyContacts: [],
  safeWord: null,
  safeWords: [],
  theme: "dark",
  colorMode: "standard",
  reducedTransparency: false,
  accentHue: "#4f8cff",
  dyslexiaFont: false,
  voiceBaseline: null,
  llmApiKey: "",
  llmEndpoint: "",
  hasSeenOnboarding: false,
  sensitivityNudge: 0,
  desktopNotifications: false,
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadSettings(): AppSettings {
  if (!isBrowser()) return defaultSettings;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings) {
  if (!isBrowser()) return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** Backfills fields added to CallReport after some reports were already
 * saved (tags/notes/feedback landed after the first shipped version) so
 * older localStorage data doesn't crash reads like `r.tags.some(...)`. */
function migrateReport(r: Partial<CallReport> & Pick<CallReport, "id">): CallReport {
  return {
    tags: [],
    notes: "",
    feedback: null,
    callLanguage: "en",
    ...r,
  } as CallReport;
}

export function loadReports(): CallReport[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(migrateReport);
  } catch {
    return [];
  }
}

export function saveReport(report: CallReport) {
  if (!isBrowser()) return;
  const reports = loadReports();
  reports.unshift(report);
  window.localStorage.setItem(REPORTS_KEY, JSON.stringify(reports.slice(0, 25)));
}

export function getReport(id: string): CallReport | undefined {
  return loadReports().find((r) => r.id === id);
}

export function updateReport(id: string, patch: Partial<CallReport>) {
  if (!isBrowser()) return;
  const reports = loadReports().map((r) => (r.id === id ? { ...r, ...patch } : r));
  window.localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

export function deleteReports(ids: string[]) {
  if (!isBrowser()) return;
  const idSet = new Set(ids);
  const reports = loadReports().filter((r) => !idSet.has(r.id));
  window.localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

export function clearAllData() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SETTINGS_KEY);
  window.localStorage.removeItem(REPORTS_KEY);
}

export function exportSettingsFile(settings: AppSettings) {
  if (!isBrowser()) return;
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "guardian-line-settings.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportedSettings(raw: string): Partial<AppSettings> | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as Partial<AppSettings>;
  } catch {
    return null;
  }
}

/** Aggregate counts computed entirely from this device's saved reports —
 * nothing here is ever transmitted anywhere, it's just a local summary
 * of `loadReports()`. There is no server, so there's no "aggregate
 * analytics" beyond what a single device can see about itself. */
export interface LocalStats {
  totalCalls: number;
  dangerCalls: number;
  cautionCalls: number;
  safeWordChallenges: number;
  safeWordPasses: number;
  averageTrustScore: number;
}

export function computeLocalStats(reports: CallReport[]): LocalStats {
  if (reports.length === 0) {
    return { totalCalls: 0, dangerCalls: 0, cautionCalls: 0, safeWordChallenges: 0, safeWordPasses: 0, averageTrustScore: 100 };
  }
  const dangerCalls = reports.filter((r) => r.finalBand === "danger").length;
  const cautionCalls = reports.filter((r) => r.finalBand === "caution").length;
  const safeWordChallenges = reports.filter((r) => r.safeWordChallenged).length;
  const safeWordPasses = reports.filter((r) => r.safeWordChallenged && r.safeWordPassed).length;
  const averageTrustScore = Math.round(reports.reduce((sum, r) => sum + r.finalTrustScore, 0) / reports.length);
  return { totalCalls: reports.length, dangerCalls, cautionCalls, safeWordChallenges, safeWordPasses, averageTrustScore };
}

export function loadCustomPatterns(): CustomPattern[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_PATTERNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomPatterns(patterns: CustomPattern[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(CUSTOM_PATTERNS_KEY, JSON.stringify(patterns));
}

/** Exports only category/phrase/severity — never anything from an
 * actual call — so this file is safe to hand to another Guardian Line
 * user (there is no server to upload it to). */
export function exportCustomPatterns(patterns: CustomPattern[]) {
  if (!isBrowser()) return;
  const blob = new Blob([JSON.stringify(patterns, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "guardian-line-community-patterns.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportedPatterns(raw: string): CustomPattern[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (p): p is CustomPattern =>
        p && typeof p.category === "string" && typeof p.phrase === "string" && typeof p.severity === "string"
    );
  } catch {
    return null;
  }
}

/** Reads the "was this flag helpful?" feedback already recorded on
 * reports and suggests a one-time sensitivity adjustment — three or
 * more "not helpful" verdicts on caution/danger calls suggests the
 * sensitivity slider is set too high for this user. Purely a local
 * suggestion; never applied automatically. */
export function suggestSensitivityNudge(reports: CallReport[]): number {
  const judged = reports.filter((r) => r.feedback !== null && r.finalBand !== "safe");
  if (judged.length < 3) return 0;
  const notHelpful = judged.filter((r) => r.feedback === "not-helpful").length;
  const ratio = notHelpful / judged.length;
  if (ratio >= 0.6) return -10;
  if (ratio <= 0.15) return 5;
  return 0;
}
