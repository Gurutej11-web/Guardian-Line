"use client";

import { useSettings } from "@/context/SettingsContext";
import { ContentPage } from "@/components/ContentPage";

export default function TermsPage() {
  const { settings } = useSettings();
  const lang = settings.language;
  return (
    <ContentPage title={lang === "en" ? "Terms" : "Términos"}>
      <p>
        {lang === "en"
          ? "Guardian Line is provided as-is, for informational and educational purposes. It is not a certified fraud-detection system, not legal or financial advice, and not a substitute for your bank's fraud department or local law enforcement."
          : "Guardian Line se proporciona tal cual, con fines informativos y educativos. No es un sistema certificado de detección de fraude ni un sustituto del departamento de fraude de tu banco."}
      </p>
      <h2>{lang === "en" ? "No guarantee of accuracy" : "Sin garantía de precisión"}</h2>
      <p>
        {lang === "en"
          ? "Every score Guardian Line produces is a probability estimate from heuristic signal processing and pattern matching — not a certified determination. It can miss real scams and it can flag legitimate calls. Never rely on it as your only safeguard against fraud."
          : "Cada puntuación que produce Guardian Line es una estimación de probabilidad — no una determinación certificada. Nunca la uses como tu única protección contra el fraude."}
      </p>
      <h2>{lang === "en" ? "Your data, your device" : "Tus datos, tu dispositivo"}</h2>
      <p>
        {lang === "en"
          ? "Since everything is stored locally in your browser, you are responsible for backing up anything you want to keep (Settings → Backup → Export settings, or export individual reports). Clearing your browser's site data will permanently delete it."
          : "Ya que todo se almacena localmente en tu navegador, eres responsable de respaldar lo que quieras conservar."}
      </p>
    </ContentPage>
  );
}
