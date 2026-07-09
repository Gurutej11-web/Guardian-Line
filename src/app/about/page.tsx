"use client";

import { useSettings } from "@/context/SettingsContext";
import { ContentPage } from "@/components/ContentPage";

export default function AboutPage() {
  const { settings } = useSettings();
  const lang = settings.language;
  return (
    <ContentPage title={lang === "en" ? "About Guardian Line" : "Acerca de Guardian Line"}>
      <p>
        {lang === "en"
          ? "AI voice cloning now needs as little as 3–10 seconds of sample audio to produce a convincing clone of someone's voice. Scammers are already using cloned voices of grandchildren, bosses, and bank officers to build urgent, emotionally manipulative calls. Guardian Line exists to catch that live — during the call, not after the money is gone."
          : "La clonación de voz por IA ahora necesita apenas 3–10 segundos de audio para producir una clonación convincente. Guardian Line existe para detectarlo en vivo — durante la llamada, no después de que el dinero se haya ido."}
      </p>
      <h2>{lang === "en" ? "How it's built" : "Cómo está construido"}</h2>
      <p>
        {lang === "en"
          ? "Two independent signals — real client-side audio forensics and a rolling scam-language classifier — fuse into one calm, explainable Trust Meter. Everything runs on-device by default. See the README on GitHub for the full technical breakdown, including an honest account of what's a measured signal versus a documented heuristic."
          : "Dos señales independientes — análisis de audio real y un clasificador de lenguaje de estafa — se combinan en un medidor de confianza único y explicable. Todo se ejecuta en el dispositivo de forma predeterminada."}
      </p>
      <h2>{lang === "en" ? "What this isn't" : "Lo que esto no es"}</h2>
      <p>
        {lang === "en"
          ? "Guardian Line is not a certified fraud-detection product, not a law-enforcement tool, and not a replacement for your own judgment or your bank's fraud department. It's a co-pilot — built to make the moment of doubt a little clearer, a little calmer, and a little more actionable."
          : "Guardian Line no es un producto certificado de detección de fraude, ni una herramienta policial, ni un reemplazo de tu propio juicio. Es un copiloto."}
      </p>
    </ContentPage>
  );
}
