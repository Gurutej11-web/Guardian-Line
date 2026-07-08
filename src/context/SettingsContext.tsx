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
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveSettings(settings);
  }, [settings, hydrated]);

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
