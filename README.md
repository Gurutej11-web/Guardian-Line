# Guardian Line

**Real-time AI voice-clone & scam call detection.**

> "Guardian Line listens alongside your phone calls in real time and warns you the moment a voice sounds cloned or a conversation turns into a scam — before you send the money."

Built for **Lumora Hacks Summer 2026**.

## The problem

AI voice cloning now needs 3–10 seconds of sample audio to produce a convincing clone of someone's voice. Scammers use cloned voices of grandchildren, bosses, and bank officers to create urgent, emotionally manipulative calls. The FBI, FTC, and AARP have all issued warnings about this — and no mainstream consumer tool detects it *live, during the call*.

## What's here

Guardian Line fuses two independent signals into one calm, explainable Trust Meter:

1. **Voice authenticity** — real client-side audio forensics (pitch jitter, amplitude shimmer, spectral flatness via an in-house FFT + autocorrelation pitch tracker) estimate the probability a voice is synthetic. Runs entirely on-device.
2. **Conversational risk** — a rolling scam-language classifier tags live transcript text into five categories: urgency, financial requests, isolation tactics, authority impersonation, and emotional manipulation.

Either signal alone can raise a flag; both together escalate faster — mirroring how a real scam call stacks tactics.

### Feature tour

| Feature | Where |
|---|---|
| Live Trust Meter (calm green → amber → red gauge) | [`/dashboard`](src/app/dashboard/page.tsx) |
| Live mic mode (real Web Speech transcription + real audio forensics) | [`/dashboard`](src/app/dashboard/page.tsx) |
| Scripted demo calls (reliable, repeatable, for presenting) | [`/dashboard`](src/app/dashboard/page.tsx) → `lib/demoScenarios.ts` |
| Explainability panel (plain-language reason for every flag) | `components/ExplainabilityPanel.tsx` |
| Inline transcript highlighting | `components/TranscriptView.tsx` |
| Safe Word verification prompt | `components/SafeWordModal.tsx` |
| "Break the Spell" actionable intervention | `components/BreakTheSpellBanner.tsx` |
| Family Circle alert (consent-based, simulated) | `components/FamilyCircleAlert.tsx` |
| Post-call report: sparkline, flagged moments, printable export, FTC-style `.txt` export | [`/reports/[id]`](src/app/reports/%5Bid%5D/page.tsx) |
| Real-vs-synthetic voice comparison ("wow moment" demo) | [`/demo`](src/app/demo/page.tsx) |
| Settings: sensitivity, privacy mode, high contrast, large text, Safe Word, Family Circle | [`/settings`](src/app/settings/page.tsx) |
| English + Spanish, throughout | `lib/i18n.ts` |
| Browser extension shell (Manifest V3) | [`extension/`](extension/README.md) |

## Architecture

```
        Call audio (mic input / uploaded clip)
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
  Audio Forensics                Speech-to-Text
  (pitch, jitter,               (Web Speech API)
   shimmer, spectral                   │
   flatness — real FFT +               ▼
   autocorrelation)             Scam-Language Classifier
        │                       (rule-engine, EN + ES)
        ▼                             │
  Synthetic Voice Score               │
        └───────────────┬─────────────┘
                         ▼
                  Fusion Engine
                (weighted Trust Meter)
                         ▼
         UI: Trust Meter · Explainability ·
          Transcript · Alerts · Report
```

## Tech stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript
- **Audio capture:** Web Audio API (`AnalyserNode`, `MediaRecorder`, `OfflineAudioContext`)
- **Transcription:** Web Speech API (`SpeechRecognition`), with a scripted-playback fallback for reliable demos
- **Voice forensics:** hand-written radix-2 FFT + autocorrelation pitch detection, run entirely client-side
- **Scam-language detection:** rule/keyword classifier (English + Spanish) — the seam where a real LLM classifier call would slot in for production (see "What's simulated" below)
- **State/storage:** React context + `localStorage` (session-only by default, nothing leaves the device)
- **Browser extension:** Manifest V3

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For the Live Monitor's live-mic mode you'll need microphone permission and a Chromium-based browser (Web Speech API support varies); the **Scripted Demo Call** mode works everywhere and is the recommended path for presenting.

## What's real vs. simulated — read this before you demo it

Being upfront about this, the same way the project spec itself calls for:

- **Audio forensics (pitch jitter, shimmer, spectral flatness) is real signal processing** run against real audio buffers — whether from your live microphone, an uploaded clip, or a procedurally generated synthetic reference tone on the `/demo` page. Nothing here is a random number.
- **The synthetic reference sample on `/demo`** is a procedurally generated test tone engineered to exhibit the acoustic fingerprints of synthetic speech (near-zero pitch jitter, a mechanically regular amplitude envelope) — it is **not** a clone of any specific person's voice. That would require a real voice-cloning model, explicitly out of scope for a hackathon-weekend build (the spec's own "Risks & Honest Mitigations" section calls this out).
- **The scam-language classifier is a rule/keyword engine**, not a hosted LLM call — chosen so the demo never depends on a network request or API key. The function signature (`classifyText`) is the intentional seam where a real LLM-based classifier would be swapped in for production.
- **Scripted demo calls** simulate the caller's voice-authenticity reading (rather than measuring a captured deepfake sample) so the Trust Meter's escalation is reliable and repeatable for live presentations — exactly the tradeoff the spec's own "reliability tip" recommends.
- **Family Circle alerts** are simulated in the UI — no real SMS/push/email is sent.
- Everything is session-only in `localStorage` on your device. Nothing is transmitted anywhere.

## Project structure

```
src/
  app/            Next.js App Router pages (/, /dashboard, /demo, /reports, /settings)
  components/     Trust Meter, transcript view, explainability panel, modals, icons
  context/        Settings context (language, sensitivity, privacy, Safe Word, Family Circle)
  lib/            Detection engines: audioForensics, scamClassifier, fusionEngine,
                  transcription, demoScenarios, i18n, storage, types
extension/        Manifest V3 browser extension shell
```

## Roadmap

- Carrier-level integration so detection runs natively on incoming calls, no extension required.
- On-device model compression for a trained anti-spoofing model (replacing the current heuristic) at real-time mobile performance.
- Partnership potential with banks and senior-safety organizations for a "verified safe call" ecosystem.
- `tabCapture`-based real audio tap for the browser extension, with explicit per-tab user consent.
- Expanded scam-pattern library across more languages and regional scam typologies.
