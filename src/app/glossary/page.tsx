"use client";

import { useSettings } from "@/context/SettingsContext";
import { ContentPage } from "@/components/ContentPage";

const terms = [
  {
    term: { en: "Pitch jitter", es: "Jitter de tono" },
    def: {
      en: "How much the period between vocal-cord vibrations varies from cycle to cycle. Real human voices always have a little; near-zero jitter is a synthetic-speech tell.",
      es: "Cuánto varía el período entre vibraciones de las cuerdas vocales de un ciclo a otro. Las voces humanas siempre tienen algo; un jitter casi nulo es señal de habla sintética.",
    },
  },
  {
    term: { en: "Amplitude shimmer", es: "Shimmer de amplitud" },
    def: {
      en: "How much the loudness of consecutive vocal cycles varies. Like jitter, natural speech has irregular shimmer driven by breath and glottal noise.",
      es: "Cuánto varía el volumen de ciclos vocales consecutivos.",
    },
  },
  {
    term: { en: "Spectral flatness", es: "Planitud espectral" },
    def: {
      en: "A measure of how 'peaky' (tonal, formant-rich) versus 'flat' (noise-like) a sound's frequency spectrum is.",
      es: "Una medida de qué tan 'pico' (tonal) o 'plano' (como ruido) es el espectro de frecuencia de un sonido.",
    },
  },
  {
    term: { en: "Trust Meter", es: "Medidor de confianza" },
    def: {
      en: "The single, color-graded 0-100 score that fuses the voice-authenticity and conversation-risk signals.",
      es: "La puntuación única de 0 a 100 que combina las señales de autenticidad de voz y riesgo de conversación.",
    },
  },
  {
    term: { en: "Safe Word", es: "Palabra segura" },
    def: {
      en: "A private phrase you register in advance with your family, used to verify a caller's identity if a call turns risky.",
      es: "Una frase privada que registras de antemano con tu familia, usada para verificar la identidad de quien llama.",
    },
  },
  {
    term: { en: "Family Circle", es: "Círculo familiar" },
    def: {
      en: "An opt-in feature that notifies a trusted contact if a call crosses a high-risk threshold.",
      es: "Una función opcional que notifica a un contacto de confianza si una llamada cruza un umbral de alto riesgo.",
    },
  },
];

export default function GlossaryPage() {
  const { settings } = useSettings();
  const lang = settings.language;
  return (
    <ContentPage title={lang === "en" ? "Glossary" : "Glosario"}>
      {terms.map((t) => (
        <div key={t.term.en}>
          <h2>{t.term[lang]}</h2>
          <p className="mt-1">{t.def[lang]}</p>
        </div>
      ))}
    </ContentPage>
  );
}
