import { describe, expect, it } from "vitest";
import { scoreSyntheticProbability, VoiceForensicsAnalyzer } from "./audioForensics";

describe("scoreSyntheticProbability", () => {
  it("scores near-zero jitter/shimmer with flat spectrum as highly synthetic", () => {
    const score = scoreSyntheticProbability({ jitterPct: 0, shimmerPct: 0, flatness: 0.6 });
    expect(score).toBeGreaterThan(70);
  });

  it("scores natural human-range jitter/shimmer as low synthetic probability", () => {
    const score = scoreSyntheticProbability({ jitterPct: 1.5, shimmerPct: 6, flatness: 0.15 });
    expect(score).toBeLessThan(20);
  });

  it("stays within 0-100 for extreme inputs", () => {
    expect(scoreSyntheticProbability({ jitterPct: 0, shimmerPct: 0, flatness: 1 })).toBeLessThanOrEqual(100);
    expect(scoreSyntheticProbability({ jitterPct: 50, shimmerPct: 50, flatness: 0 })).toBeGreaterThanOrEqual(0);
  });
});

describe("VoiceForensicsAnalyzer", () => {
  function generateSineFrame(freqHz: number, sampleRate: number, size: number, phase = 0): Float32Array {
    const frame = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      frame[i] = 0.5 * Math.sin((2 * Math.PI * freqHz * i) / sampleRate + phase);
    }
    return frame;
  }

  it("returns null until enough voiced history has accumulated", () => {
    const analyzer = new VoiceForensicsAnalyzer(40);
    const sampleRate = 44100;
    const frame = generateSineFrame(150, sampleRate, 2048);
    const first = analyzer.analyzeFrame(frame, sampleRate, 0);
    expect(first).toBeNull();
  });

  it("detects a perfectly steady tone as near-zero jitter after enough frames", () => {
    const analyzer = new VoiceForensicsAnalyzer(40);
    const sampleRate = 44100;
    let result = null;
    for (let i = 0; i < 8; i++) {
      const frame = generateSineFrame(150, sampleRate, 2048);
      result = analyzer.analyzeFrame(frame, sampleRate, i * 100);
    }
    expect(result).not.toBeNull();
    expect(result!.pitchJitterPct).toBeLessThan(1);
  });

  it("reset() clears accumulated history", () => {
    const analyzer = new VoiceForensicsAnalyzer(40);
    const sampleRate = 44100;
    for (let i = 0; i < 8; i++) {
      analyzer.analyzeFrame(generateSineFrame(150, sampleRate, 2048), sampleRate, i * 100);
    }
    expect(analyzer.samples.length).toBeGreaterThan(0);
    analyzer.reset();
    expect(analyzer.samples.length).toBe(0);
  });
});
