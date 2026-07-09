import { Language } from "./types";

export const translations = {
  en: {
    appName: "Guardian Line",
    tagline: "Real-time voice-clone & scam call detection",
    nav: {
      home: "Home",
      dashboard: "Live Monitor",
      demo: "Voice Demo",
      settings: "Settings",
      reports: "Reports",
    },
    trustMeter: {
      title: "Trust Meter",
      safe: "Looks safe",
      caution: "Stay alert",
      danger: "High risk detected",
      voiceAuth: "Voice authenticity",
      transcriptRisk: "Conversation risk",
    },
    breakTheSpell: {
      title: "Break the spell",
      suggestion:
        "Hang up and call them back on a number you already have saved.",
    },
    safeWord: {
      title: "Safe Word Check",
      prompt: "Ask the caller for your family's safe word.",
      passed: "Safe word confirmed",
      failed: "Safe word not given — treat this call as unverified",
    },
    familyCircle: {
      title: "Family Circle",
      alertSent: "Alert sent to your Family Circle",
    },
    report: {
      title: "Post-Call Summary",
      verdict: "Overall verdict",
      export: "Export report",
      fileScam: "File FTC-style report",
    },
    privacy: {
      onDevice: "On-device",
      transmitted: "Anonymized scores only",
    },
  },
  es: {
    appName: "Guardian Line",
    tagline: "Detección en tiempo real de voces clonadas y estafas",
    nav: {
      home: "Inicio",
      dashboard: "Monitor en vivo",
      demo: "Demo de voz",
      settings: "Configuración",
      reports: "Informes",
    },
    trustMeter: {
      title: "Medidor de confianza",
      safe: "Parece seguro",
      caution: "Mantente alerta",
      danger: "Riesgo alto detectado",
      voiceAuth: "Autenticidad de voz",
      transcriptRisk: "Riesgo de la conversación",
    },
    breakTheSpell: {
      title: "Rompe el hechizo",
      suggestion:
        "Cuelga y devuelve la llamada a un número que ya tengas guardado.",
    },
    safeWord: {
      title: "Verificación de palabra segura",
      prompt: "Pídele a quien llama la palabra segura de tu familia.",
      passed: "Palabra segura confirmada",
      failed: "No se dio la palabra segura — trata esta llamada como no verificada",
    },
    familyCircle: {
      title: "Círculo familiar",
      alertSent: "Alerta enviada a tu Círculo familiar",
    },
    report: {
      title: "Resumen de la llamada",
      verdict: "Veredicto general",
      export: "Exportar informe",
      fileScam: "Presentar informe estilo FTC",
    },
    privacy: {
      onDevice: "En el dispositivo",
      transmitted: "Solo puntuaciones anonimizadas",
    },
  },
} as const;

export function t(lang: Language) {
  return translations[lang];
}

/** Single source of truth for `Intl`/`toLocaleString` locale tags, so
 * date and number formatting doesn't drift out of sync with the
 * app-language ternaries scattered across pages. */
const localeTags: Record<Language, string> = {
  en: "en-US",
  es: "es-ES",
};

export function localeFor(lang: Language): string {
  return localeTags[lang];
}

/** Text direction for the current display language. All languages this
 * build ships a translated UI for (en/es) are left-to-right, but this
 * is real plumbing — layout.tsx and SettingsContext both read it — so
 * adding a right-to-left language later (Arabic, Hebrew, Urdu) means
 * changing this one map, not hunting down hardcoded "ltr" strings. */
const directions: Record<Language, "ltr" | "rtl"> = {
  en: "ltr",
  es: "ltr",
};

export function dirFor(lang: Language): "ltr" | "rtl" {
  return directions[lang];
}

export const categoryLabels: Record<
  string,
  { en: string; es: string; description: { en: string; es: string } }
> = {
  "voice-authenticity": {
    en: "Voice authenticity",
    es: "Autenticidad de voz",
    description: {
      en: "Unnatural pitch, jitter, or spectral pattern detected in the audio",
      es: "Se detectó un patrón de tono o espectral no natural en el audio",
    },
  },
  "speaker-consistency": {
    en: "Speaker consistency",
    es: "Consistencia del hablante",
    description: {
      en: "The voice's characteristics shifted mid-call",
      es: "Las características de la voz cambiaron durante la llamada",
    },
  },
  urgency: {
    en: "Urgency / time pressure",
    es: "Urgencia / presión de tiempo",
    description: {
      en: "Language pressuring immediate action",
      es: "Lenguaje que presiona una acción inmediata",
    },
  },
  "financial-request": {
    en: "Financial request",
    es: "Solicitud financiera",
    description: {
      en: "Request for money, gift cards, wire transfer, or crypto",
      es: "Solicitud de dinero, tarjetas de regalo, transferencia o cripto",
    },
  },
  isolation: {
    en: "Isolation tactic",
    es: "Táctica de aislamiento",
    description: {
      en: "Caller asking to keep the conversation secret",
      es: "Quien llama pide mantener la conversación en secreto",
    },
  },
  "authority-impersonation": {
    en: "Authority impersonation",
    es: "Suplantación de autoridad",
    description: {
      en: "Caller claiming to be a bank, government, or law enforcement",
      es: "Quien llama afirma ser un banco, gobierno o autoridad",
    },
  },
  "emotional-manipulation": {
    en: "Emotional manipulation",
    es: "Manipulación emocional",
    description: {
      en: "Fear, guilt, or panic framing used to cloud judgment",
      es: "Se usa miedo, culpa o pánico para nublar el juicio",
    },
  },
};
