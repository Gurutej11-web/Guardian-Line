# Guardian Line — Devpost submission

## Inspiration

AI voice cloning now needs as little as 3–10 seconds of sample audio to produce a convincing clone of someone's voice. Scammers are already using cloned voices of grandchildren, bosses, and bank officers to build urgent, emotionally manipulative calls — "I've been arrested," "wire the deposit now," "don't tell mom." The FBI, FTC, and AARP have all issued specific warnings about this, with elderly people as the primary target and reported losses in the billions annually. Video and image deepfake detection get a lot of attention; live, in-call audio detection barely exists as a consumer tool. That gap — real, current, and personal — is what we built Guardian Line for.

## What it does

Guardian Line runs alongside a call and fuses two independent signals into one calm, explainable **Trust Meter**:

- **Voice authenticity** — on-device audio forensics (pitch jitter, amplitude shimmer, spectral flatness) estimate the probability a voice is synthetic.
- **Conversational risk** — a live transcript classifier flags urgency, financial requests, isolation tactics, authority impersonation, and emotional manipulation as they're spoken.

Either signal alone raises a flag; both together escalate faster. Every flag comes with a plain-language explanation — never a black-box number. On top of that: a pre-registered **Safe Word** the app prompts you to ask for mid-call, a **Break the Spell** banner that suggests a concrete next action ("hang up and call back on a number you already have saved"), an opt-in **Family Circle** alert for a trusted contact, and a shareable **post-call report** with an FTC-report-formatted export. A dedicated demo page lets you record your own voice and compare it live against a synthetic reference sample, so you can watch the forensics engine react in real time.

## How we built it

Next.js 16 + React 19 + TypeScript + Tailwind, entirely client-side. The audio forensics module is a hand-written radix-2 FFT plus autocorrelation-based pitch detection running against real audio buffers (live mic via `AnalyserNode`, or a decoded upload/recording) — no server round-trip, no API key. The scam-language signal is a rule/keyword classifier (English + Spanish) built with the same function signature a hosted LLM classifier would use in production, so swapping one in later doesn't touch any caller. A fusion engine combines both scores into the Trust Meter with sensitivity-adjustable thresholds. Transcription uses the Web Speech API for live mic mode, with a scripted-playback mode (real classifier + real fusion engine, simulated voice-authenticity readings) for a reliable, repeatable presentation path. Everything session-only in `localStorage` — nothing leaves the device unless the user explicitly exports a report.

## Challenges we ran into

The biggest one: autocorrelation pitch detection has a well-known ambiguity between a signal's true fundamental period and its integer multiples (octave-down errors), which is especially visible on harmonic-rich audio. We hit this directly while building the real-vs-synthetic demo — our procedurally generated synthetic reference tone was scoring as *less* synthetic than real speech, the opposite of what real signal properties should show. Fixed it by preferring the shortest lag whose correlation is within 85% of the global peak, the standard fix for locking onto the fundamental instead of a harmonic. That also made the live-mic pitch tracking noticeably more stable. Second challenge: designing a scam-language classifier that's fast and reliable without a network dependency, while keeping the exact seam where a real LLM call would slot in later. Third: tuning the fusion engine's weighting so a single strong signal (say, a clear "send gift cards" request) raises real concern without either signal alone triggering full panic — the spec's "calm, not alarming" principle in code.

## Accomplishments we're proud of

Live fusion of real audio forensics and rolling transcript analysis into one Trust Meter that visibly, correctly escalates during a scripted scam call and stays calm during a benign control call — verified end-to-end in the browser, not just on paper. The privacy-first architecture (all analysis on-device, nothing transmitted, session-only storage) isn't a caveat bolted on at the end; it's how the whole thing is built. And the honesty of the demo: everything that looks like a measurement actually is one, and everywhere we simulate something (the scripted call's voice reading, the Family Circle SMS), the UI and code say so.

## What we learned

The fundamentals of voice forensics (jitter, shimmer, spectral flatness) and why autocorrelation-based pitch tracking needs an explicit fundamental-vs-harmonic disambiguation step to be trustworthy. How to architect a "fusion" system where two weak, individually-noisy signals combine into something more decisive than either alone. And how much of "responsible AI" in a consumer safety tool is really a product-design problem — calm color grading, plain-language explanations, and a concrete next action, not just a bigger red number.

## What's next

Carrier-level integration so detection runs natively on incoming calls with no extension required. A trained anti-spoofing model (replacing today's transparent heuristic) compressed for real-time mobile performance. Partnership potential with banks and senior-safety organizations for a "verified safe call" ecosystem. A `tabCapture`-based real audio tap for the browser extension, with explicit per-tab consent. And an expanded, community-sourced scam-pattern library across more languages and regional scam typologies.
