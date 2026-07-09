"use client";

import { useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { ShieldIcon, KeyIcon, UsersIcon } from "./icons";

const steps = [
  {
    icon: ShieldIcon,
    title: { en: "Meet the Trust Meter", es: "Conoce el Medidor de confianza" },
    body: {
      en: "A calm, color-graded gauge fuses voice authenticity and conversation risk into one score. Green means it looks safe, amber means stay alert, red means high risk.",
      es: "Un medidor tranquilo combina la autenticidad de voz y el riesgo de conversación en una sola puntuación.",
    },
  },
  {
    icon: KeyIcon,
    title: { en: "Register a Safe Word", es: "Registra una palabra segura" },
    body: {
      en: "In Settings, set a private phrase only your family knows. If a call turns risky, Guardian Line prompts you to ask for it.",
      es: "En Configuración, establece una frase privada que solo tu familia conozca.",
    },
  },
  {
    icon: UsersIcon,
    title: { en: "Set up Family Circle (optional)", es: "Configura el Círculo familiar (opcional)" },
    body: {
      en: "With your consent, a trusted contact can be notified in real time if a call crosses a high-risk threshold.",
      es: "Con tu consentimiento, un contacto de confianza puede ser notificado en tiempo real.",
    },
  },
];

export function OnboardingModal({ onClose }: { onClose: () => void }) {
  const { settings } = useSettings();
  const lang = settings.language;
  const [step, setStep] = useState(0);
  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="animate-fade-in-up w-full max-w-sm rounded-2xl border border-border-strong bg-background-card p-6 shadow-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15">
          <Icon className="h-5 w-5 text-accent" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">{current.title[lang]}</h3>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{current.body[lang]}</p>

        <div className="mt-5 flex items-center justify-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-accent" : "w-1.5 bg-border-strong"}`}
            />
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-border-strong px-4 py-2 text-xs font-medium hover:bg-background-elevated"
          >
            {lang === "en" ? "Skip" : "Omitir"}
          </button>
          <button
            onClick={() => (step < steps.length - 1 ? setStep(step + 1) : onClose())}
            className="btn-press flex-1 rounded-full bg-accent-solid px-4 py-2 text-sm font-semibold text-white hover:bg-accent-solid-hover"
          >
            {step < steps.length - 1 ? (lang === "en" ? "Next" : "Siguiente") : (lang === "en" ? "Get started" : "Comenzar")}
          </button>
        </div>
      </div>
    </div>
  );
}
