"use client";

import Link from "next/link";
import { useSettings } from "@/context/SettingsContext";
import { Reveal } from "@/components/Reveal";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { AmbientWaveform } from "@/components/AmbientWaveform";
import { ParallaxLayer } from "@/components/ParallaxLayer";
import {
  AlertIcon,
  CheckIcon,
  KeyIcon,
  LockIcon,
  PhoneIcon,
  ShieldIcon,
  UsersIcon,
  WaveformIcon,
} from "@/components/icons";

const stats = [
  {
    target: 10,
    format: (n: number) => `3–${n}s`,
    label: { en: "of sample audio needed to clone a voice", es: "de audio necesarios para clonar una voz" },
  },
  {
    target: 1,
    format: (n: number) => `$${n}B+`,
    label: { en: "in reported losses annually to imposter scams", es: "en pérdidas reportadas anualmente por estafas de suplantación" },
  },
  {
    target: 0,
    format: (n: number) => `${n}`,
    label: { en: "mainstream tools that catch this live, during the call", es: "herramientas comunes que lo detectan en vivo, durante la llamada" },
  },
];

const signalFeatures = [
  {
    icon: WaveformIcon,
    title: { en: "Voice authenticity signal", es: "Señal de autenticidad de voz" },
    body: {
      en: "Real signal processing — pitch jitter, shimmer, spectral flatness — estimates the probability a voice is synthetic, entirely on-device.",
      es: "Procesamiento de señal real — jitter de tono, shimmer, planitud espectral — estima si una voz es sintética, todo en el dispositivo.",
    },
  },
  {
    icon: AlertIcon,
    title: { en: "Conversational risk signal", es: "Señal de riesgo conversacional" },
    body: {
      en: "Live transcript analysis tags urgency, money requests, secrecy demands, and impersonation claims as they're spoken.",
      es: "El análisis de la transcripción en vivo etiqueta urgencia, solicitudes de dinero, secreto y suplantación mientras se habla.",
    },
  },
  {
    icon: ShieldIcon,
    title: { en: "One fused Trust Meter", es: "Un medidor de confianza unificado" },
    body: {
      en: "Both signals combine into a single calm, color-graded gauge — never a black box, always explainable.",
      es: "Ambas señales se combinan en un solo medidor tranquilo y explicable — nunca una caja negra.",
    },
  },
];

const protectionFeatures = [
  {
    icon: KeyIcon,
    title: { en: "Safe Word verification", es: "Verificación de palabra segura" },
    body: {
      en: "Pre-register a private family phrase. If a call turns risky, Guardian Line prompts you to ask for it.",
      es: "Registra una frase familiar privada. Si una llamada se vuelve riesgosa, se te pide que la solicites.",
    },
  },
  {
    icon: UsersIcon,
    title: { en: "Family Circle alerts", es: "Alertas de círculo familiar" },
    body: {
      en: "A trusted contact can optionally be notified in real time when a call crosses a high-risk threshold.",
      es: "Un contacto de confianza puede ser notificado en tiempo real si una llamada cruza un umbral de alto riesgo.",
    },
  },
  {
    icon: LockIcon,
    title: { en: "Privacy-first by design", es: "Privacidad primero por diseño" },
    body: {
      en: "Audio never leaves your device. Only anonymized risk scores are ever transmitted, and only if you opt in.",
      es: "El audio nunca sale de tu dispositivo. Solo se transmiten puntuaciones anonimizadas, y solo si lo autorizas.",
    },
  },
];

export default function Home() {
  const { settings } = useSettings();
  const lang = settings.language;

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--accent-dim)_0%,_transparent_65%)] opacity-20" />
          <ParallaxLayer speed={0.15} className="absolute inset-x-0 bottom-0 h-40 sm:h-56">
            <AmbientWaveform
              className="h-full opacity-[0.14] [mask-image:linear-gradient(to_top,black,transparent)]"
              barCount={72}
            />
          </ParallaxLayer>
        </div>
        <div className="mx-auto max-w-6xl px-5 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-border-subtle bg-background-elevated px-3.5 py-1 text-xs font-medium text-foreground-muted">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-trust-safe opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-trust-safe" />
              </span>
              {lang === "en" ? "Real-time protection · runs entirely on-device" : "Protección en tiempo real · todo en el dispositivo"}
            </span>
            <h1
              className="animate-fade-in-up mt-6 text-4xl font-semibold tracking-tight sm:text-6xl"
              style={{ animationDelay: "80ms" }}
            >
              {lang === "en" ? (
                <>Know it&apos;s them.<br />Before you send the money.</>
              ) : (
                <>Sabe que es él.<br />Antes de enviar el dinero.</>
              )}
            </h1>
            <p
              className="animate-fade-in-up mt-6 text-lg leading-relaxed text-foreground-muted"
              style={{ animationDelay: "160ms" }}
            >
              {lang === "en"
                ? "Guardian Line listens alongside your phone calls in real time and warns you the moment a voice sounds cloned or a conversation turns into a scam."
                : "Guardian Line escucha junto a tus llamadas en tiempo real y te avisa en el momento en que una voz suena clonada o una conversación se convierte en una estafa."}
            </p>
            <div
              className="animate-fade-in-up mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
              style={{ animationDelay: "240ms" }}
            >
              <Link
                href="/dashboard"
                className="btn-press w-full sm:w-auto rounded-full bg-accent-solid px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 hover:bg-accent-solid-hover"
              >
                {lang === "en" ? "Open Live Monitor" : "Abrir monitor en vivo"}
              </Link>
              <Link
                href="/demo"
                className="btn-press w-full sm:w-auto rounded-full border border-border-strong px-6 py-3 text-sm font-semibold text-foreground hover:bg-background-elevated"
              >
                {lang === "en" ? "See the voice demo" : "Ver la demo de voz"}
              </Link>
            </div>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {stats.map((s, i) => (
              <Reveal key={s.label.en} delayMs={i * 100}>
                <div className="card-hover rounded-2xl border border-border-subtle bg-background-card px-6 py-8 text-center">
                  <div className="text-3xl font-bold text-accent tabular-nums">
                    <AnimatedCounter target={s.target} format={s.format} />
                  </div>
                  <div className="mt-2 text-sm text-foreground-muted">{s.label[lang]}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            {lang === "en" ? "Two signals. One calm answer." : "Dos señales. Una respuesta tranquila."}
          </h2>
          <p className="mt-4 text-foreground-muted">
            {lang === "en"
              ? "Voice forensics and conversation analysis are fused into a single, explainable Trust Meter — either signal can raise a flag, both together escalate it."
              : "El análisis de voz y de la conversación se combinan en un solo medidor de confianza explicable — cualquiera de las señales puede alertar, ambas juntas lo escalan."}
          </p>
        </Reveal>

        <div className="mt-14">
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">
            {lang === "en" ? "How it detects" : "Cómo detecta"}
          </span>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {signalFeatures.map((f, i) => (
              <Reveal key={f.title.en} delayMs={i * 90}>
                <div className="card-hover group h-full rounded-2xl border border-border-subtle bg-background-card p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 transition-transform duration-300 group-hover:scale-110">
                    <f.icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title[lang]}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{f.body[lang]}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="mt-14">
          <span className="text-xs font-semibold uppercase tracking-wider text-trust-safe">
            {lang === "en" ? "How it protects" : "Cómo protege"}
          </span>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {protectionFeatures.map((f, i) => (
              <Reveal key={f.title.en} delayMs={i * 90}>
                <div className="card-hover group h-full rounded-2xl border border-border-subtle bg-background-card p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-trust-safe/10 transition-transform duration-300 group-hover:scale-110">
                    <f.icon className="h-5 w-5 text-trust-safe" />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title[lang]}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{f.body[lang]}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border-subtle bg-background-elevated/40">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight">
                {lang === "en" ? "Calm, not alarming." : "Tranquilo, no alarmante."}
              </h2>
              <p className="mt-4 text-foreground-muted leading-relaxed">
                {lang === "en"
                  ? "Color-graded green → amber → red instead of flashing sirens. Every flag is paired with a plain-language reason, and every alert pairs with a concrete next step — never just a number."
                  : "Gradiente de color verde → ámbar → rojo en lugar de sirenas. Cada alerta va acompañada de una razón en lenguaje claro y de un siguiente paso concreto."}
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  lang === "en" ? "Explainability panel for every flag" : "Panel de explicación para cada alerta",
                  lang === "en" ? "Inline transcript highlighting" : "Resaltado en línea en la transcripción",
                  lang === "en" ? "Shareable post-call report" : "Informe de llamada compartible",
                  lang === "en" ? "English + Spanish from day one" : "Inglés y español desde el primer día",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <CheckIcon className="h-4 w-4 text-trust-safe shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delayMs={120}>
              <div className="card-hover rounded-2xl border border-border-subtle bg-background-card p-6">
                <div className="flex items-center gap-2 text-xs text-foreground-muted">
                  <PhoneIcon className="h-4 w-4" />
                  {lang === "en" ? "Live call preview" : "Vista previa de llamada en vivo"}
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-trust-caution">
                    <span className="text-lg font-bold text-trust-caution">62</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-trust-caution">
                      {lang === "en" ? "Stay alert" : "Mantente alerta"}
                    </div>
                    <div className="mt-1 text-xs text-foreground-muted">
                      {lang === "en"
                        ? "Financial request detected: “gift cards” — 0:49"
                        : "Solicitud financiera detectada: “tarjetas de regalo” — 0:49"}
                    </div>
                  </div>
                </div>
                <div className="mt-5 rounded-xl bg-background-elevated p-4 text-xs leading-relaxed text-foreground-muted">
                  {lang === "en"
                    ? "“…please act now, I don't have much time left.”"
                    : "“…por favor actúa ahora, no me queda mucho tiempo.”"}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 text-center">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight">
            {lang === "en" ? "See it catch a cloned voice." : "Míralo detectar una voz clonada."}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-foreground-muted">
            {lang === "en"
              ? "Record yourself, then compare against a synthetic reference sample — watch the Trust Meter react in real time."
              : "Grábate a ti mismo y compáralo con una muestra sintética de referencia — observa cómo reacciona el medidor en tiempo real."}
          </p>
          <Link
            href="/demo"
            className="btn-press mt-8 inline-flex items-center gap-2 rounded-full bg-accent-solid px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 hover:bg-accent-solid-hover"
          >
            {lang === "en" ? "Try the voice demo" : "Probar la demo de voz"}
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
