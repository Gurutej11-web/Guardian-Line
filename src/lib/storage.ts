import { AppSettings, CallReport } from "./types";

const SETTINGS_KEY = "guardianline.settings.v1";
const REPORTS_KEY = "guardianline.reports.v1";

export const defaultSettings: AppSettings = {
  language: "en",
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

export function loadReports(): CallReport[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(REPORTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
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
