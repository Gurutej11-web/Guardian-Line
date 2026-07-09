import { VoiceFeatureSample } from "./types";
import { analyzeChannelDataFull } from "./audioForensics";

/** Runs the heavy full-buffer forensics pass off the main thread when
 * Web Workers are available, so the UI never jank's during analysis of
 * a longer recording. Falls back to running inline (same result) if
 * workers aren't supported in this environment. */
export function analyzeInWorker(channelData: Float32Array, sampleRate: number): Promise<VoiceFeatureSample | null> {
  if (typeof Worker === "undefined") {
    return Promise.resolve(analyzeChannelDataFull(channelData, sampleRate));
  }

  return new Promise((resolve) => {
    let settled = false;
    let worker: Worker;
    try {
      worker = new Worker(new URL("./analysisWorker.ts", import.meta.url));
    } catch {
      resolve(analyzeChannelDataFull(channelData, sampleRate));
      return;
    }

    const finish = (result: VoiceFeatureSample | null) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      resolve(result);
    };

    worker.onmessage = (event: MessageEvent<VoiceFeatureSample | null>) => finish(event.data);
    worker.onerror = () => finish(analyzeChannelDataFull(channelData, sampleRate));

    // Copy the buffer being posted — the original Float32Array's backing
    // ArrayBuffer would otherwise be transferred (and become unusable on
    // the main thread) rather than cloned.
    const copy = new Float32Array(channelData);
    worker.postMessage({ channelData: copy, sampleRate }, [copy.buffer]);
  });
}
