import { SpeakerConsistencyResult, VoiceFeatureSample } from "./types";

/**
 * Real signal-processing audio forensics module.
 *
 * Runs entirely client-side (privacy-first: raw audio never leaves the
 * device). Estimates pitch jitter, amplitude shimmer, and spectral
 * flatness from short analysis frames using autocorrelation pitch
 * detection and an in-house radix-2 FFT, then combines them into a
 * heuristic synthetic-voice probability.
 *
 * This is intentionally a transparent heuristic (documented in the
 * README) rather than a trained anti-spoofing model — the same
 * shortcut the project spec calls out as an acceptable hackathon-scope
 * tradeoff. The metrics themselves are computed from real audio, not
 * simulated.
 */

const FRAME_SIZE = 2048;

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Iterative radix-2 Cooley-Tukey FFT, in place, length must be a power of 2. */
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curWr = 1;
      let curWi = 0;
      const half = len / 2;
      for (let j = 0; j < half; j++) {
        const ur = re[i + j];
        const ui = im[i + j];
        const vr = re[i + j + half] * curWr - im[i + j + half] * curWi;
        const vi = re[i + j + half] * curWi + im[i + j + half] * curWr;
        re[i + j] = ur + vr;
        im[i + j] = ui + vi;
        re[i + j + half] = ur - vr;
        im[i + j + half] = ui - vi;
        const nwr = curWr * wr - curWi * wi;
        const nwi = curWr * wi + curWi * wr;
        curWr = nwr;
        curWi = nwi;
      }
    }
  }
}

function spectralFlatness(frame: Float32Array): number {
  const n = frame.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    re[i] = frame[i] * w;
  }
  fft(re, im);
  const half = n / 2;
  let logSum = 0;
  let sum = 0;
  let count = 0;
  for (let i = 1; i < half; i++) {
    const mag = Math.sqrt(re[i] * re[i] + im[i] * im[i]) + 1e-9;
    logSum += Math.log(mag);
    sum += mag;
    count++;
  }
  if (count === 0 || sum === 0) return 0;
  const geoMean = Math.exp(logSum / count);
  const arithMean = sum / count;
  return clamp01(geoMean / arithMean);
}

function autocorrelatePitch(
  frame: Float32Array,
  sampleRate: number
): { pitchHz: number; voiced: boolean } {
  const size = frame.length;
  let rms = 0;
  for (let i = 0; i < size; i++) rms += frame[i] * frame[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.008) return { pitchHz: 0, voiced: false };

  const minLag = Math.floor(sampleRate / 500);
  const maxLag = Math.floor(sampleRate / 60);
  const correlations = new Float64Array(maxLag - minLag + 1);
  let bestLag = -1;
  let bestCorr = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < size - lag; i++) {
      corr += frame[i] * frame[i + lag];
    }
    corr /= size - lag;
    correlations[lag - minLag] = corr;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  if (bestLag <= 0) return { pitchHz: 0, voiced: false };

  // Autocorrelation is ambiguous between a true fundamental period and its
  // integer multiples (octave-down errors), which is especially visible on
  // harmonic-rich tones. Prefer the shortest lag whose correlation is close
  // to the global max — the standard fix for locking onto the fundamental
  // instead of a harmonic — otherwise pitch estimates flip between octaves
  // frame-to-frame and corrupt jitter/shimmer measurements.
  const threshold = bestCorr * 0.85;
  let chosenLag = bestLag;
  for (let lag = minLag; lag <= bestLag; lag++) {
    if (correlations[lag - minLag] >= threshold) {
      chosenLag = lag;
      break;
    }
  }

  const normalizedCorr = bestCorr / (rms * rms);
  return { pitchHz: sampleRate / chosenLag, voiced: normalizedCorr > 0.28 };
}

export function scoreSyntheticProbability(features: {
  jitterPct: number;
  shimmerPct: number;
  flatness: number;
}): number {
  const jitterScore = clamp01(1 - features.jitterPct / 1.2);
  const shimmerScore = clamp01(1 - features.shimmerPct / 4.2);
  const flatnessScore = clamp01((features.flatness - 0.12) / 0.4);
  const combined = jitterScore * 0.4 + shimmerScore * 0.35 + flatnessScore * 0.25;
  return Math.round(clamp01(combined) * 100);
}

/** Stateful analyzer that accumulates voiced-frame history to compute
 * jitter/shimmer/flatness trends over the course of a call. */
export class VoiceForensicsAnalyzer {
  private periodHistory: number[] = [];
  private ampHistory: number[] = [];
  private flatnessHistory: number[] = [];
  private pitchHistory: number[] = [];
  private totalFrames = 0;
  readonly samples: VoiceFeatureSample[] = [];
  readonly historyLimit: number;

  constructor(historyLimit = 40) {
    this.historyLimit = historyLimit;
  }

  private pushCapped(arr: number[], v: number) {
    arr.push(v);
    if (arr.length > this.historyLimit) arr.shift();
  }

  analyzeFrame(
    frame: Float32Array,
    sampleRate: number,
    timestampMs: number
  ): VoiceFeatureSample | null {
    this.totalFrames++;
    const { pitchHz, voiced } = autocorrelatePitch(frame, sampleRate);
    const flatness = spectralFlatness(frame);
    this.pushCapped(this.flatnessHistory, flatness);

    if (voiced && pitchHz > 0) {
      let peak = 0;
      for (let i = 0; i < frame.length; i++) peak = Math.max(peak, Math.abs(frame[i]));
      this.pushCapped(this.periodHistory, sampleRate / pitchHz);
      this.pushCapped(this.ampHistory, peak);
      this.pushCapped(this.pitchHistory, pitchHz);
    }

    if (this.periodHistory.length < 4) return null;

    let jitterSum = 0;
    for (let i = 1; i < this.periodHistory.length; i++) {
      jitterSum +=
        Math.abs(this.periodHistory[i] - this.periodHistory[i - 1]) /
        this.periodHistory[i - 1];
    }
    const jitterPct = (jitterSum / (this.periodHistory.length - 1)) * 100;

    let shimmerSum = 0;
    for (let i = 1; i < this.ampHistory.length; i++) {
      const prev = this.ampHistory[i - 1] || 1e-6;
      shimmerSum += Math.abs(this.ampHistory[i] - prev) / prev;
    }
    const shimmerPct = (shimmerSum / (this.ampHistory.length - 1)) * 100;

    const meanFlatness =
      this.flatnessHistory.reduce((a, b) => a + b, 0) / this.flatnessHistory.length;
    const meanPitch =
      this.pitchHistory.reduce((a, b) => a + b, 0) / this.pitchHistory.length;
    const voicedFrameRatio = this.periodHistory.length / Math.min(this.totalFrames, this.historyLimit);

    const syntheticProbability = scoreSyntheticProbability({
      jitterPct,
      shimmerPct,
      flatness: meanFlatness,
    });

    const sample: VoiceFeatureSample = {
      timestampMs,
      syntheticProbability,
      pitchJitterPct: jitterPct,
      shimmerPct,
      spectralFlatness: meanFlatness,
      meanPitchHz: meanPitch,
      voicedFrameRatio,
    };
    this.samples.push(sample);
    return sample;
  }

  reset() {
    this.periodHistory = [];
    this.ampHistory = [];
    this.flatnessHistory = [];
    this.pitchHistory = [];
    this.totalFrames = 0;
    this.samples.length = 0;
  }
}

export function checkSpeakerConsistency(
  baseline: VoiceFeatureSample,
  current: VoiceFeatureSample
): SpeakerConsistencyResult {
  const pitchDrift =
    Math.abs(current.meanPitchHz - baseline.meanPitchHz) / (baseline.meanPitchHz || 1);
  const flatnessDrift = Math.abs(current.spectralFlatness - baseline.spectralFlatness);
  const driftScore = pitchDrift * 0.65 + flatnessDrift * 0.35;
  return { shiftDetected: driftScore > 0.35, driftScore };
}

/** Analyzes an entire pre-recorded/decoded AudioBuffer in one pass by
 * sliding a frame across it, returning the final aggregate sample. */
export function analyzeAudioBufferFull(buffer: AudioBuffer): VoiceFeatureSample | null {
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const hop = Math.floor(FRAME_SIZE / 2);
  const analyzer = new VoiceForensicsAnalyzer(80);
  let last: VoiceFeatureSample | null = null;

  for (let offset = 0; offset + FRAME_SIZE <= data.length; offset += hop) {
    const frame = data.subarray(offset, offset + FRAME_SIZE) as Float32Array;
    const timestampMs = (offset / sampleRate) * 1000;
    const result = analyzer.analyzeFrame(frame, sampleRate, timestampMs);
    if (result) last = result;
  }
  return last;
}

/** Captures live microphone audio and periodically emits forensics samples. */
export class LiveMicCapture {
  private audioCtx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  readonly analyzer = new VoiceForensicsAnalyzer(40);

  /** Exposes the underlying AnalyserNode so a UI component can drive a
   * real-time waveform/level visualizer off the same live audio graph
   * without competing with the (slower, 300ms-interval) forensics loop. */
  getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  async start(onSample: (sample: VoiceFeatureSample) => void, startedAt: number) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new Ctx();
    const source = this.audioCtx.createMediaStreamSource(this.stream);
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = FRAME_SIZE;
    source.connect(this.analyserNode);

    const buffer = new Float32Array(FRAME_SIZE);
    this.intervalId = setInterval(() => {
      if (!this.analyserNode || !this.audioCtx) return;
      this.analyserNode.getFloatTimeDomainData(buffer);
      const sample = this.analyzer.analyzeFrame(
        buffer,
        this.audioCtx.sampleRate,
        Date.now() - startedAt
      );
      if (sample) onSample(sample);
    }, 300);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
    this.analyserNode = null;
  }
}

/** Procedurally generates a perfectly regular, formant-like waveform
 * that exhibits the acoustic fingerprints of synthetic speech (near-zero
 * pitch jitter, deterministic amplitude envelope) so the forensics
 * module can be demonstrated against a real, analyzable audio buffer
 * without depending on a third-party voice-cloning model. */
export async function generateSyntheticReferenceBuffer(durationSec = 3): Promise<AudioBuffer> {
  const sampleRate = 44100;
  const OfflineCtx =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;
  const ctx = new OfflineCtx(1, sampleRate * durationSec, sampleRate);

  const fundamental = 128;
  const harmonics = [1, 2, 3, 4, 5, 6];
  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);

  harmonics.forEach((h, idx) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = fundamental * h;
    const gain = ctx.createGain();
    gain.gain.value = 0.5 / (idx + 1.4);
    osc.connect(gain).connect(master);
    osc.start(0);
    osc.stop(durationSec);
  });

  const envSampleRate = 200;
  const curveLen = Math.floor(durationSec * envSampleRate);
  const curve = new Float32Array(curveLen);
  const syllableHz = 3.4;
  for (let i = 0; i < curveLen; i++) {
    const tSec = i / envSampleRate;
    // A shallow, slow envelope keeps amplitude nearly constant hop-to-hop
    // (near-zero shimmer) while still giving the tone a faint pulse —
    // real speech shimmer is driven by irregular glottal noise, which a
    // smooth deterministic sinusoid at low depth does not reproduce.
    const raw = Math.sin(2 * Math.PI * syllableHz * tSec) ** 2;
    curve[i] = 0.2 + raw * 0.03;
  }
  master.gain.setValueCurveAtTime(curve, 0, durationSec);

  return ctx.startRendering();
}

/** Records a short microphone clip and decodes it to an AudioBuffer for
 * one-shot forensic analysis (used by the real-vs-synthetic voice demo). */
export async function recordMicClip(durationMs = 3500): Promise<AudioBuffer> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  recorder.start();
  await new Promise((resolve) => setTimeout(resolve, durationMs));
  recorder.stop();
  stream.getTracks().forEach((track) => track.stop());
  await stopped;

  const blob = new Blob(chunks, { type: recorder.mimeType });
  const arrayBuffer = await blob.arrayBuffer();
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new Ctx();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();
  return audioBuffer;
}

/** Plays back a decoded/generated AudioBuffer through the speakers. */
export async function playAudioBuffer(buffer: AudioBuffer): Promise<void> {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  await new Promise((resolve) => setTimeout(resolve, buffer.duration * 1000 + 100));
  await ctx.close();
}
