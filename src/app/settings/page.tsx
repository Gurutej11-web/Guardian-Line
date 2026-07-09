"use client";

import { useMemo, useRef, useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { clearAllData, exportSettingsFile, parseImportedSettings } from "@/lib/storage";
import { defaultSettings } from "@/lib/storage";
import { FamilyContact, SafeWordEntry } from "@/lib/types";
import { classifyWithLlm } from "@/lib/llmClassifier";
import { classifyText } from "@/lib/scamClassifier";
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

function Section({
  title,
  description,
  children,
  delayMs = 0,
  onReset,
  resetLabel,
  match,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  delayMs?: number;
  onReset?: () => void;
  resetLabel?: string;
  match: boolean;
}) {
  if (!match) return null;
  return (
    <section
      className="card-hover animate-fade-in-up rounded-2xl border border-border-subtle bg-background-card p-6"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {onReset && (
          <button onClick={onReset} className="shrink-0 text-xs text-foreground-muted underline hover:text-foreground">
            {resetLabel}
          </button>
        )}
      </div>
      {description && <p className="mt-1 text-xs text-foreground-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function safeWordStrength(phrase: string, lang: "en" | "es"): { label: string; color: string } | null {
  const trimmed = phrase.trim();
  if (!trimmed) return null;
  const common = ["password", "12345", "letmein", "abc123", "safe word", "palabra segura"];
  const weak = trimmed.length < 6 || /^\d+$/.test(trimmed) || common.includes(trimmed.toLowerCase());
  if (weak) {
    return { label: lang === "en" ? "Weak — pick something less guessable" : "Débil — elige algo menos adivinable", color: "var(--trust-danger)" };
  }
  if (trimmed.length < 10) {
    return { label: lang === "en" ? "Okay" : "Aceptable", color: "var(--trust-caution)" };
  }
  return { label: lang === "en" ? "Strong" : "Fuerte", color: "var(--trust-safe)" };
}

function isValidContactValue(method: FamilyContact["method"], value: string): boolean {
  const v = value.trim();
  if (method === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  if (method === "sms") return /^\+?[0-9()\-.\s]{7,}$/.test(v);
  return v.length > 0;
}

export default function SettingsPage() {
  const { settings, updateSettings, strings } = useSettings();
  const { showToast } = useToast();
  const lang = settings.language;

  const [search, setSearch] = useState("");
  const [safeWordLabel, setSafeWordLabel] = useState("");
  const [safeWordInput, setSafeWordInput] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactMethod, setContactMethod] = useState<FamilyContact["method"]>("sms");
  const [contactValue, setContactValue] = useState("");
  const [contactThreshold, setContactThreshold] = useState<FamilyContact["notifyThreshold"]>("danger");
  const [contactError, setContactError] = useState<string | null>(null);
  const [llmTestText, setLlmTestText] = useState("");
  const [llmTestResult, setLlmTestResult] = useState<string | null>(null);
  const [llmTesting, setLlmTesting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const q = search.trim().toLowerCase();
  const matches = (...text: string[]) => !q || text.some((t) => t.toLowerCase().includes(q));

  const strength = useMemo(() => safeWordStrength(safeWordInput, lang), [safeWordInput, lang]);

  function addSafeWord() {
    if (!safeWordInput.trim()) return;
    const entry: SafeWordEntry = {
      id: `safeword-${Date.now()}`,
      label: safeWordLabel.trim() || (lang === "en" ? "Family" : "Familia"),
      phrase: safeWordInput.trim(),
    };
    updateSettings({ safeWords: [...settings.safeWords, entry] });
    setSafeWordLabel("");
    setSafeWordInput("");
    showToast(lang === "en" ? "Safe word saved" : "Palabra segura guardada", "success");
  }

  function removeSafeWord(id: string) {
    updateSettings({ safeWords: settings.safeWords.filter((s) => s.id !== id) });
    showToast(lang === "en" ? "Safe word removed" : "Palabra segura eliminada");
  }

  function addContact() {
    if (!contactName.trim() || !contactValue.trim()) return;
    if (!isValidContactValue(contactMethod, contactValue)) {
      setContactError(
        contactMethod === "email"
          ? lang === "en" ? "That doesn't look like a valid email." : "Eso no parece un correo válido."
          : lang === "en" ? "That doesn't look like a valid phone number." : "Eso no parece un número válido."
      );
      return;
    }
    if (settings.familyContacts.some((c) => c.contactValue.trim().toLowerCase() === contactValue.trim().toLowerCase())) {
      setContactError(lang === "en" ? "That contact is already in your Family Circle." : "Ese contacto ya está en tu Círculo familiar.");
      return;
    }
    setContactError(null);
    const newContact: FamilyContact = {
      id: `contact-${Date.now()}`,
      name: contactName.trim(),
      method: contactMethod,
      contactValue: contactValue.trim(),
      notifyThreshold: contactThreshold,
    };
    updateSettings({ familyContacts: [...settings.familyContacts, newContact] });
    setContactName("");
    setContactValue("");
    showToast(lang === "en" ? "Contact added" : "Contacto añadido", "success");
  }

  function removeContact(id: string) {
    updateSettings({ familyContacts: settings.familyContacts.filter((c) => c.id !== id) });
    showToast(lang === "en" ? "Contact removed" : "Contacto eliminado");
  }

  async function testLlmClassifier() {
    if (!llmTestText.trim()) return;
    setLlmTesting(true);
    setLlmTestResult(null);
    const heuristic = classifyText(llmTestText, lang);
    const llm = await classifyWithLlm(llmTestText, lang, settings.llmApiKey, settings.llmEndpoint);
    setLlmTesting(false);
    const heuristicSummary = heuristic.length
      ? heuristic.map((m) => `${m.category} (${m.severity}): "${m.phrase}"`).join("; ")
      : lang === "en" ? "no matches" : "sin coincidencias";
    if (llm === null) {
      setLlmTestResult(
        (lang === "en" ? "Heuristic: " : "Heurística: ") +
          heuristicSummary +
          (lang === "en"
            ? "\n\nLLM: not configured or request failed — falling back to heuristic only."
            : "\n\nLLM: no configurado o falló la solicitud — usando solo la heurística.")
      );
      return;
    }
    const llmSummary = llm.length
      ? llm.map((m) => `${m.category} (${m.severity}): "${m.phrase}"`).join("; ")
      : lang === "en" ? "no matches" : "sin coincidencias";
    setLlmTestResult(`${lang === "en" ? "Heuristic" : "Heurística"}: ${heuristicSummary}\n\nLLM: ${llmSummary}`);
  }

  function handleImportFile(file: File) {
    file.text().then((raw) => {
      const parsed = parseImportedSettings(raw);
      if (!parsed) {
        showToast(lang === "en" ? "That file couldn't be read as settings." : "No se pudo leer ese archivo como configuración.", "danger");
        return;
      }
      updateSettings(parsed);
      showToast(lang === "en" ? "Settings imported" : "Configuración importada", "success");
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{strings.nav.settings}</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        {lang === "en"
          ? "Tune how sensitive Guardian Line is, and set up your family's safety net."
          : "Ajusta la sensibilidad de Guardian Line y configura tu red de seguridad familiar."}
      </p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={lang === "en" ? "Search settings…" : "Buscar configuración…"}
        className="mt-6 w-full rounded-full border border-border-subtle bg-background-elevated px-4 py-2.5 text-sm outline-none focus:border-accent"
      />

      <div className="mt-6 space-y-5">
        <Section
          title={lang === "en" ? "Language" : "Idioma"}
          delayMs={0}
          match={matches(lang === "en" ? "Language" : "Idioma", "english", "español")}
        >
          <div className="flex gap-2">
            {(["en", "es"] as const).map((l) => (
              <button
                key={l}
                onClick={() => updateSettings({ language: l })}
                className={`btn-press rounded-full px-4 py-2 text-sm font-medium ${
                  settings.language === l ? "bg-accent-solid text-white" : "border border-border-strong text-foreground-muted"
                }`}
              >
                {l === "en" ? "English" : "Español"}
              </button>
            ))}
          </div>
        </Section>

        <Section
          delayMs={40}
          title={lang === "en" ? "Appearance" : "Apariencia"}
          description={lang === "en" ? "Theme, color mode, and readability." : "Tema, modo de color y legibilidad."}
          match={matches("Appearance", "Apariencia", "theme", "tema", "color", "font", "fuente")}
          resetLabel={lang === "en" ? "Reset" : "Restablecer"}
          onReset={() =>
            updateSettings({
              theme: defaultSettings.theme,
              colorMode: defaultSettings.colorMode,
              reducedTransparency: defaultSettings.reducedTransparency,
              dyslexiaFont: defaultSettings.dyslexiaFont,
              accentHue: defaultSettings.accentHue,
            })
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-medium">{lang === "en" ? "Light theme" : "Tema claro"}</div>
              <Toggle
                checked={settings.theme === "light"}
                onChange={(v) => updateSettings({ theme: v ? "light" : "dark" })}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">{lang === "en" ? "Colorblind-safe palette" : "Paleta segura para daltonismo"}</div>
                <p className="text-xs text-foreground-muted">
                  {lang === "en" ? "Swaps red/green for blue/orange in the Trust Meter." : "Cambia rojo/verde por azul/naranja en el medidor."}
                </p>
              </div>
              <Toggle
                checked={settings.colorMode === "colorblind-safe"}
                onChange={(v) => updateSettings({ colorMode: v ? "colorblind-safe" : "standard" })}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-medium">{lang === "en" ? "Reduce transparency" : "Reducir transparencia"}</div>
              <Toggle checked={settings.reducedTransparency} onChange={(v) => updateSettings({ reducedTransparency: v })} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-medium">{lang === "en" ? "Dyslexia-friendly font" : "Fuente para dislexia"}</div>
              <Toggle checked={settings.dyslexiaFont} onChange={(v) => updateSettings({ dyslexiaFont: v })} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-medium">{lang === "en" ? "Accent color" : "Color de acento"}</div>
              <input
                type="color"
                value={settings.accentHue}
                onChange={(e) => updateSettings({ accentHue: e.target.value })}
                className="h-8 w-12 cursor-pointer rounded border border-border-strong bg-transparent"
              />
            </div>
          </div>
        </Section>

        <Section
          delayMs={80}
          title={lang === "en" ? "Sensitivity" : "Sensibilidad"}
          description={
            lang === "en"
              ? "Higher sensitivity flags risk earlier, but may raise more false positives."
              : "Una mayor sensibilidad marca el riesgo antes, pero puede generar más falsos positivos."
          }
          resetLabel={lang === "en" ? "Reset" : "Restablecer"}
          onReset={() => updateSettings({ sensitivity: defaultSettings.sensitivity })}
          match={matches("Sensitivity", "Sensibilidad")}
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

        <Section
          delayMs={120}
          title={lang === "en" ? "Privacy & accessibility" : "Privacidad y accesibilidad"}
          match={matches("Privacy", "Privacidad", "accessibility", "accesibilidad", "contrast", "contraste", "text", "texto")}
        >
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
          delayMs={160}
          title={strings.safeWord.title}
          description={
            lang === "en"
              ? "A private phrase only your family knows. Register one per relative if you'd like — Guardian Line will prompt for it if a call turns risky."
              : "Una frase privada que solo tu familia conoce. Registra una por familiar si quieres — se te pedirá si una llamada se vuelve riesgosa."
          }
          match={matches(strings.safeWord.title, "safe word", "palabra segura")}
        >
          <div className="space-y-3">
            {settings.safeWords.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{s.label}</span>{" "}
                  <span className="font-mono text-xs text-foreground-muted">“{s.phrase}”</span>
                </div>
                <button onClick={() => removeSafeWord(s.id)} className="text-xs text-trust-danger">
                  {lang === "en" ? "Remove" : "Eliminar"}
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15">
                <KeyIcon className="h-4 w-4 text-accent" />
              </div>
              <input
                value={safeWordLabel}
                onChange={(e) => setSafeWordLabel(e.target.value)}
                placeholder={lang === "en" ? "Who's this for? (optional)" : "¿Para quién es? (opcional)"}
                className="w-28 shrink-0 rounded-lg border border-border-subtle bg-background-elevated px-2 py-2 text-xs outline-none focus:border-accent"
              />
              <input
                value={safeWordInput}
                onChange={(e) => setSafeWordInput(e.target.value)}
                placeholder={lang === "en" ? "e.g. Blue Umbrella" : "ej. Paraguas Azul"}
                className="flex-1 rounded-lg border border-border-subtle bg-background-elevated px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                onClick={addSafeWord}
                className="btn-press rounded-lg bg-accent-solid px-3 py-2 text-xs font-semibold text-white hover:bg-accent-solid-hover"
              >
                {lang === "en" ? "Save" : "Guardar"}
              </button>
            </div>
            {strength && (
              <p className="text-xs" style={{ color: strength.color }}>
                {strength.label}
              </p>
            )}
          </div>
        </Section>

        <Section
          delayMs={200}
          title={strings.familyCircle.title}
          description={
            lang === "en"
              ? "With your consent, a trusted contact can be notified in real time if a call crosses your chosen threshold."
              : "Con tu consentimiento, un contacto de confianza puede ser notificado en tiempo real si una llamada cruza el umbral elegido."
          }
          match={matches(strings.familyCircle.title, "family circle", "círculo familiar", "contact", "contacto")}
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
                      ({c.method} · {c.contactValue} ·{" "}
                      {c.notifyThreshold === "danger"
                        ? lang === "en" ? "danger only" : "solo peligro"
                        : lang === "en" ? "caution+" : "precaución+"}
                      )
                    </span>
                  </div>
                  <button onClick={() => removeContact(c.id)} className="text-xs text-trust-danger">
                    {lang === "en" ? "Remove" : "Eliminar"}
                  </button>
                </div>
              ))}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                <select
                  value={contactThreshold}
                  onChange={(e) => setContactThreshold(e.target.value as FamilyContact["notifyThreshold"])}
                  className="rounded-lg border border-border-subtle bg-background-elevated px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="danger">{lang === "en" ? "Notify at danger only" : "Notificar solo en peligro"}</option>
                  <option value="caution">{lang === "en" ? "Notify at caution or higher" : "Notificar en precaución o más"}</option>
                </select>
              </div>
              {contactError && <p className="text-xs text-trust-danger">{contactError}</p>}
              <button
                onClick={addContact}
                className="btn-press w-full rounded-lg bg-accent-solid px-3 py-2 text-xs font-semibold text-white hover:bg-accent-solid-hover"
              >
                {lang === "en" ? "Add contact" : "Añadir contacto"}
              </button>
            </div>
          )}
        </Section>

        <Section
          delayMs={240}
          title={lang === "en" ? "Backup" : "Copia de seguridad"}
          description={
            lang === "en"
              ? "Export your settings to a file, or restore them on another device."
              : "Exporta tu configuración a un archivo, o restáurala en otro dispositivo."
          }
          match={matches("Backup", "Copia de seguridad", "export", "exportar", "import", "importar")}
        >
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportSettingsFile(settings)}
              className="btn-press rounded-full border border-border-strong px-4 py-2 text-xs font-medium hover:bg-background-elevated"
            >
              {lang === "en" ? "Export settings" : "Exportar configuración"}
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="btn-press rounded-full border border-border-strong px-4 py-2 text-xs font-medium hover:bg-background-elevated"
            >
              {lang === "en" ? "Import settings" : "Importar configuración"}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
              }}
            />
          </div>
        </Section>

        <Section
          delayMs={260}
          title={lang === "en" ? "LLM classifier (experimental)" : "Clasificador LLM (experimental)"}
          description={
            lang === "en"
              ? "Bring your own OpenAI-compatible API key to compare an LLM classification against the built-in offline heuristic. Never used in a live call unless you wire it in yourself — this is a side-by-side tester."
              : "Usa tu propia clave de API compatible con OpenAI para comparar una clasificación LLM contra la heurística incorporada. Solo es un comparador de prueba."
          }
          match={matches("LLM", "classifier", "clasificador", "api key")}
        >
          <div className="space-y-3">
            <input
              value={settings.llmApiKey}
              onChange={(e) => updateSettings({ llmApiKey: e.target.value })}
              placeholder={lang === "en" ? "API key (stored only in this browser)" : "Clave API (solo en este navegador)"}
              type="password"
              className="w-full rounded-lg border border-border-subtle bg-background-elevated px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              value={settings.llmEndpoint}
              onChange={(e) => updateSettings({ llmEndpoint: e.target.value })}
              placeholder="https://api.openai.com/v1/chat/completions"
              className="w-full rounded-lg border border-border-subtle bg-background-elevated px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <textarea
              value={llmTestText}
              onChange={(e) => setLlmTestText(e.target.value)}
              placeholder={lang === "en" ? "Paste a line of transcript to test…" : "Pega una línea de transcripción para probar…"}
              rows={2}
              className="w-full rounded-lg border border-border-subtle bg-background-elevated px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              onClick={testLlmClassifier}
              disabled={llmTesting || !llmTestText.trim()}
              className="btn-press w-full rounded-lg bg-accent-solid px-3 py-2 text-xs font-semibold text-white hover:bg-accent-solid-hover disabled:opacity-50"
            >
              {llmTesting ? (lang === "en" ? "Testing…" : "Probando…") : lang === "en" ? "Compare classifiers" : "Comparar clasificadores"}
            </button>
            {llmTestResult && (
              <pre className="whitespace-pre-wrap rounded-lg bg-background-elevated p-3 text-xs text-foreground-muted">{llmTestResult}</pre>
            )}
          </div>
        </Section>

        <Section
          delayMs={300}
          title={lang === "en" ? "Data" : "Datos"}
          match={matches("Data", "Datos", "clear", "borrar")}
        >
          <button
            onClick={() => {
              if (confirm(lang === "en" ? "Clear all settings and saved reports on this device?" : "¿Borrar toda la configuración e informes guardados en este dispositivo?")) {
                clearAllData();
                window.location.reload();
              }
            }}
            className="btn-press rounded-full border border-trust-danger/50 px-4 py-2 text-xs font-medium text-trust-danger hover:bg-trust-danger/10"
          >
            {lang === "en" ? "Clear all local data" : "Borrar todos los datos locales"}
          </button>
        </Section>
      </div>
    </div>
  );
}
