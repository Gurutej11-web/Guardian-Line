"use client";

import { useSettings } from "@/context/SettingsContext";
import { UsersIcon } from "./icons";

export function FamilyCircleAlert({ contactNames }: { contactNames: string[] }) {
  const { strings, settings } = useSettings();
  return (
    <div className="animate-fade-in-up fixed bottom-5 right-5 z-50 max-w-xs rounded-2xl border border-border-strong bg-background-card p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15">
          <UsersIcon className="h-[18px] w-[18px] text-accent" />
        </div>
        <div>
          <div className="text-sm font-semibold">{strings.familyCircle.title}</div>
          <p className="mt-0.5 text-xs leading-relaxed text-foreground-muted">
            {strings.familyCircle.alertSent}
            {contactNames.length > 0 && `: ${contactNames.join(", ")}`}
          </p>
          <p className="mt-1 text-[11px] text-foreground-muted">
            {settings.language === "en"
              ? "(simulated — no real message was sent)"
              : "(simulado — no se envió ningún mensaje real)"}
          </p>
        </div>
      </div>
    </div>
  );
}
