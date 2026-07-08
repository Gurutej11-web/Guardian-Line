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

export function clearAllData() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SETTINGS_KEY);
  window.localStorage.removeItem(REPORTS_KEY);
}
