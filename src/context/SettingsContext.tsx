"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppSettings } from "@/lib/types";
import { defaultSettings, loadSettings, saveSettings } from "@/lib/storage";
import { t } from "@/lib/i18n";

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  strings: ReturnType<typeof t>;
  hydrated: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // One-time hydration from localStorage — must run client-side only,
    // so this legitimately cannot be a lazy useState initializer without
    // causing an SSR/client markup mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveSettings(settings);
  }, [settings, hydrated]);

  useEffect(() => {
    document.body.classList.toggle("high-contrast", settings.highContrast);
    document.body.classList.toggle("large-text", settings.largeText);
    document.body.classList.toggle("theme-light", settings.theme === "light");
    document.body.classList.toggle("colorblind-safe", settings.colorMode === "colorblind-safe");
    document.body.classList.toggle("reduced-transparency", settings.reducedTransparency);
    document.body.classList.toggle("dyslexia-font", settings.dyslexiaFont);
    if (settings.theme !== "light" && !settings.highContrast) {
      document.documentElement.style.setProperty("--accent", settings.accentHue);
    } else {
      document.documentElement.style.removeProperty("--accent");
    }
  }, [
    settings.highContrast,
    settings.largeText,
    settings.theme,
    settings.colorMode,
    settings.reducedTransparency,
    settings.dyslexiaFont,
    settings.accentHue,
  ]);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const strings = useMemo(() => t(settings.language), [settings.language]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, strings, hydrated }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
