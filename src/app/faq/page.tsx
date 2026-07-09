"use client";

import { useSettings } from "@/context/SettingsContext";
import { ContentPage } from "@/components/ContentPage";

const faqs = [
  {
    q: { en: "Does my audio ever get uploaded anywhere?", es: "¿Mi audio se sube a algún lado?" },
    a: {
      en: "No. Voice forensics (pitch jitter, shimmer, spectral flatness) run entirely in your browser using the Web Audio API. Raw audio never leaves your device. If you enable the optional LLM classifier in Settings with your own API key, only short transcript text snippets are sent — never audio.",
      es: "No. El análisis de voz se ejecuta completamente en tu navegador. El audio nunca sale de tu dispositivo. Si activas el clasificador LLM opcional con tu propia clave, solo se envían fragmentos de texto de la transcripción — nunca audio.",
    },
  },
  {
    q: { en: "What if it flags a call that turns out to be fine?", es: "¿Qué pasa si marca una llamada que en realidad estaba bien?" },
    a: {
      en: "Every score is a probability, not a verdict — that's why the Trust Meter shows a range and why every flag comes with a plain-language reason you can judge for yourself. Adjust sensitivity in Settings if you're seeing too many false alarms.",
      es: "Cada puntuación es una probabilidad, no un veredicto. Ajusta la sensibilidad en Configuración si ves demasiadas falsas alarmas.",
    },
  },
  {
    q: { en: "What if it misses a real scam?", es: "¿Qué pasa si no detecta una estafa real?" },
    a: {
      en: "Guardian Line is a co-pilot, not a guarantee. It's built on heuristics and pattern matching, not a certified fraud-detection system. Always trust your own judgment, use the Safe Word check, and when in doubt, hang up and call back on a number you already have saved.",
      es: "Guardian Line es un copiloto, no una garantía. Siempre confía en tu propio juicio y, si tienes dudas, cuelga y llama de vuelta a un número que ya tengas guardado.",
    },
  },
  {
    q: { en: "Where are my reports stored?", es: "¿Dónde se guardan mis informes?" },
    a: {
      en: "In this browser's local storage, on this device only. Nothing is synced to a server. Clearing your browser data will delete them — export important ones from Settings first.",
      es: "En el almacenamiento local de este navegador, solo en este dispositivo. Nada se sincroniza con un servidor.",
    },
  },
  {
    q: { en: "Is the synthetic voice sample on the demo page a real deepfake?", es: "¿La muestra sintética de la demo es un deepfake real?" },
    a: {
      en: "No — it's a procedurally generated test tone engineered to exhibit the acoustic fingerprints of synthetic speech (near-zero pitch jitter, a mechanically regular envelope), not a clone of any real person's voice. See the demo page for the full explanation.",
      es: "No — es un tono de prueba generado que muestra las características acústicas del habla sintética, no una clonación de la voz de una persona real.",
    },
  },
];

export default function FaqPage() {
  const { settings } = useSettings();
  const lang = settings.language;
  return (
    <ContentPage title={lang === "en" ? "Frequently asked questions" : "Preguntas frecuentes"}>
      {faqs.map((f) => (
        <div key={f.q.en}>
          <h2>{f.q[lang]}</h2>
          <p className="mt-1">{f.a[lang]}</p>
        </div>
      ))}
    </ContentPage>
  );
}
