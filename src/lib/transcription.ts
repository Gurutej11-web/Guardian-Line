import { Language } from "./types";

/** Minimal ambient typings for the Web Speech API — not part of the
 * standard TS DOM lib in all environments. */
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultLike[] & { length: number };
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isLiveTranscriptionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

const langTag: Record<Language, string> = { en: "en-US", es: "es-ES" };

export class LiveTranscriber {
  private recognition: SpeechRecognitionLike | null = null;
  private startedAt = 0;
  private stoppedManually = false;

  start(
    lang: Language,
    onResult: (text: string, isFinal: boolean, timestampMs: number) => void,
    onError?: (message: string) => void
  ) {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      onError?.("Live transcription is not supported in this browser.");
      return false;
    }
    this.startedAt = Date.now();
    this.stoppedManually = false;
    this.recognition = new Ctor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = langTag[lang];

    this.recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        if (!transcript) continue;
        onResult(transcript, result.isFinal, Date.now() - this.startedAt);
      }
    };

    this.recognition.onerror = () => {
      if (!this.stoppedManually) onError?.("Speech recognition error — check microphone permissions.");
    };

    this.recognition.onend = () => {
      if (!this.stoppedManually) {
        try {
          this.recognition?.start();
        } catch {
          // recognition already running or unavailable; ignore
        }
      }
    };

    this.recognition.start();
    return true;
  }

  stop() {
    this.stoppedManually = true;
    this.recognition?.stop();
    this.recognition = null;
  }
}
