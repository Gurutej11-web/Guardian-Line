"use client";

import { useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { clearAllData } from "@/lib/storage";
import { FamilyContact } from "@/lib/types";
import { KeyIcon, LockIcon, UsersIcon } from "@/components/icons";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-background-elevated border border-border-strong"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-background-card p-6">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-1 text-xs text-foreground-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, strings } = useSettings();
  const lang = settings.language;

  const [safeWordInput, setSafeWordInput] = useState(settings.safeWord ?? "");
  const [contactName, setContactName] = useState("");
  const [contactMethod, setContactMethod] = useState<FamilyContact["method"]>("sms");
  const [contactValue, setContactValue] = useState("");

  function addContact() {
    if (!contactName.trim() || !contactValue.trim()) return;
    const newContact: FamilyContact = {
      id: `contact-${Date.now()}`,
      name: contactName.trim(),
      method: contactMethod,
      contactValue: contactValue.trim(),
    };
    updateSettings({ familyContacts: [...settings.familyContacts, newContact] });
    setContactName("");
    setContactValue("");
  }

  function removeContact(id: string) {
    updateSettings({ familyContacts: settings.familyContacts.filter((c) => c.id !== id) });
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{strings.nav.settings}</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        {lang === "en"
          ? "Tune how sensitive Guardian Line is, and set up your family's safety net."
          : "Ajusta la sensibilidad de Guardian Line y configura tu red de seguridad familiar."}
      </p>

      <div className="mt-8 space-y-5">
        <Section title={lang === "en" ? "Language" : "Idioma"}>
          <div className="flex gap-2">
            {(["en", "es"] as const).map((l) => (
              <button
                key={l}
                onClick={() => updateSettings({ language: l })}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  settings.language === l ? "bg-accent text-white" : "border border-border-strong text-foreground-muted"
                }`}
              >
                {l === "en" ? "English" : "Español"}
              </button>
            ))}
          </div>
        </Section>

        <Section
          title={lang === "en" ? "Sensitivity" : "Sensibilidad"}
          description={
            lang === "en"
              ? "Higher sensitivity flags risk earlier, but may raise more false positives."
              : "Una mayor sensibilidad marca el riesgo antes, pero puede generar más falsos positivos."
          }
        >
          <input
            type="range"
            min={0}
            max={100}
            value={settings.sensitivity}
            onChange={(e) => updateSettings({ sensitivity: Number(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
          <div className="mt-1 flex justify-between text-xs text-foreground-muted">
            <span>{lang === "en" ? "Fewer alerts" : "Menos alertas"}</span>
            <span className="tabular-nums">{settings.sensitivity}</span>
            <span>{lang === "en" ? "Earlier warnings" : "Alertas más tempranas"}</span>
          </div>
        </Section>

        <Section title={lang === "en" ? "Privacy & accessibility" : "Privacidad y accesibilidad"}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <LockIcon className="h-5 w-5 mt-0.5 text-accent shrink-0" />
                <div>
                  <div className="text-sm font-medium">
                    {lang === "en" ? "On-device privacy mode" : "Modo de privacidad en el dispositivo"}
                  </div>
                  <p className="text-xs text-foreground-muted">
                    {lang === "en"
                      ? "Voice analysis always runs on-device. When enabled, no data of any kind is transmitted off this device."
                      : "El análisis de voz siempre se ejecuta en el dispositivo. Si está activo, ningún dato se transmite fuera de este dispositivo."}
                  </p>
                </div>
              </div>
              <Toggle checked={settings.privacyMode} onChange={(v) => updateSettings({ privacyMode: v })} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">
                  {lang === "en" ? "Calm-mode voice guidance" : "Guía de voz en modo tranquilo"}
                </div>
                <p className="text-xs text-foreground-muted">
                  {lang === "en"
                    ? "Speak alerts aloud for anyone who can't look at the screen mid-call."
                    : "Anuncia las alertas en voz alta para quien no pueda mirar la pantalla durante la llamada."}
                </p>
              </div>
              <Toggle checked={settings.calmVoiceGuidance} onChange={(v) => updateSettings({ calmVoiceGuidance: v })} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-medium">{lang === "en" ? "High contrast" : "Alto contraste"}</div>
              <Toggle checked={settings.highContrast} onChange={(v) => updateSettings({ highContrast: v })} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-medium">{lang === "en" ? "Large text" : "Texto grande"}</div>
              <Toggle checked={settings.largeText} onChange={(v) => updateSettings({ largeText: v })} />
            </div>
          </div>
        </Section>

        <Section
          title={strings.safeWord.title}
          description={
            lang === "en"
              ? "A private phrase only your family knows. Guardian Line will prompt you to ask for it if a call turns risky."
              : "Una frase privada que solo tu familia conoce. Se te pedirá solicitarla si una llamada se vuelve riesgosa."
          }
        >
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15">
              <KeyIcon className="h-4 w-4 text-accent" />
            </div>
            <input
              value={safeWordInput}
              onChange={(e) => setSafeWordInput(e.target.value)}
              placeholder={lang === "en" ? "e.g. Blue Umbrella" : "ej. Paraguas Azul"}
              className="flex-1 rounded-lg border border-border-subtle bg-background-elevated px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              onClick={() => updateSettings({ safeWord: safeWordInput.trim() || null })}
              className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent-dim transition-colors"
            >
              {lang === "en" ? "Save" : "Guardar"}
            </button>
          </div>
          {settings.safeWord && (
            <p className="mt-2 text-xs text-trust-safe">
              {lang === "en" ? "Safe word is set." : "La palabra segura está configurada."}
            </p>
          )}
        </Section>

        <Section
          title={strings.familyCircle.title}
          description={
            lang === "en"
              ? "With your consent, a trusted contact can be notified in real time if a call crosses a high-risk threshold."
              : "Con tu consentimiento, un contacto de confianza puede ser notificado en tiempo real si una llamada cruza un umbral de alto riesgo."
          }
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UsersIcon className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium">
                {lang === "en" ? "Enable Family Circle" : "Activar Círculo familiar"}
              </span>
            </div>
            <Toggle checked={settings.familyCircleEnabled} onChange={(v) => updateSettings({ familyCircleEnabled: v })} />
          </div>

          {settings.familyCircleEnabled && (
            <div className="mt-5 space-y-3">
              {settings.familyContacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{c.name}</span>{" "}
                    <span className="text-xs text-foreground-muted">
                      ({c.method} · {c.contactValue})
                    </span>
                  </div>
                  <button onClick={() => removeContact(c.id)} className="text-xs text-trust-danger">
                    {lang === "en" ? "Remove" : "Eliminar"}
                  </button>
                </div>
              ))}

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-2">
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder={lang === "en" ? "Name" : "Nombre"}
                  className="rounded-lg border border-border-subtle bg-background-elevated px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <select
                  value={contactMethod}
                  onChange={(e) => setContactMethod(e.target.value as FamilyContact["method"])}
                  className="rounded-lg border border-border-subtle bg-background-elevated px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="sms">SMS</option>
                  <option value="push">Push</option>
                  <option value="email">Email</option>
                </select>
                <input
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  placeholder={lang === "en" ? "Phone or email" : "Teléfono o correo"}
                  className="rounded-lg border border-border-subtle bg-background-elevated px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  onClick={addContact}
                  className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent-dim transition-colors"
                >
                  {lang === "en" ? "Add" : "Añadir"}
                </button>
              </div>
            </div>
          )}
        </Section>

        <Section title={lang === "en" ? "Data" : "Datos"}>
          <button
            onClick={() => {
              if (confirm(lang === "en" ? "Clear all settings and saved reports on this device?" : "¿Borrar toda la configuración e informes guardados en este dispositivo?")) {
                clearAllData();
                window.location.reload();
              }
            }}
            className="rounded-full border border-trust-danger/50 px-4 py-2 text-xs font-medium text-trust-danger hover:bg-trust-danger/10 transition-colors"
          >
            {lang === "en" ? "Clear all local data" : "Borrar todos los datos locales"}
          </button>
        </Section>
      </div>
    </div>
  );
}
