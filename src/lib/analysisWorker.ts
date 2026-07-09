/// <reference lib="webworker" />
import { analyzeChannelDataFull } from "./audioForensics";

export interface AnalysisWorkerRequest {
  channelData: Float32Array;
  sampleRate: number;
}

self.onmessage = (event: MessageEvent<AnalysisWorkerRequest>) => {
  const { channelData, sampleRate } = event.data;
  const result = analyzeChannelDataFull(channelData, sampleRate);
  (self as unknown as Worker).postMessage(result);
};
