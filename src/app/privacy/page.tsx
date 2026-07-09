"use client";

import { useSettings } from "@/context/SettingsContext";
import { ContentPage } from "@/components/ContentPage";

export default function PrivacyPage() {
  const { settings } = useSettings();
  const lang = settings.language;
  return (
    <ContentPage title={lang === "en" ? "Privacy" : "Privacidad"}>
      <p>
        {lang === "en"
          ? "This page describes what Guardian Line actually does with your data, in plain language, matching the code — not a legal boilerplate written to cover every hypothetical."
          : "Esta página describe, en lenguaje claro, lo que Guardian Line realmente hace con tus datos."}
      </p>
      <h2>{lang === "en" ? "What stays on your device" : "Qué permanece en tu dispositivo"}</h2>
      <p>
        {lang === "en"
          ? "Raw microphone audio, voice forensics features (pitch, jitter, shimmer), your transcript, your reports, your Safe Words, and your Family Circle contacts. All of it lives in your browser's localStorage. None of it is sent to a server operated by Guardian Line, because there isn't one — this is a static, client-only application."
          : "El audio del micrófono, las características de voz, tu transcripción, tus informes, tus palabras seguras y tus contactos. Todo vive en el almacenamiento local de tu navegador."}
      </p>
      <h2>{lang === "en" ? "What could leave your device" : "Qué podría salir de tu dispositivo"}</h2>
      <p>
        {lang === "en"
          ? "Only if you explicitly opt in: (1) enabling the experimental LLM classifier in Settings and providing your own API key sends short transcript text snippets to whatever endpoint you configure — that's your provider's data policy, not ours; (2) exporting a report sends nothing anywhere, it just downloads a file to your computer."
          : "Solo si lo activas explícitamente: (1) el clasificador LLM experimental con tu propia clave envía fragmentos de texto; (2) exportar un informe solo descarga un archivo a tu computadora."}
      </p>
      <h2>{lang === "en" ? "Family Circle and Safe Word" : "Círculo familiar y palabra segura"}</h2>
      <p>
        {lang === "en"
          ? "Family Circle alerts are simulated in this build — no real SMS, push notification, or email is sent to anyone. Safe Words are stored in plain text in your browser's local storage, the same as any other setting; they are not encrypted, so don't use this for anything more sensitive than a family verification phrase."
          : "Las alertas del Círculo familiar están simuladas en esta versión — no se envía ningún SMS, notificación o correo real."}
      </p>
    </ContentPage>
  );
}
