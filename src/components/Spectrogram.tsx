"use client";

import { useEffect, useRef } from "react";

/** Renders a real spectrogram (time on the x-axis, frequency on the
 * y-axis, brightness = magnitude) from a decoded AudioBuffer, using the
 * same in-house FFT the forensics engine uses — not a stock visual. */
export function Spectrogram({ buffer }: { buffer: AudioBuffer }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const data = buffer.getChannelData(0);
    const frameSize = 1024;
    const hop = 512;
    const frames: Float64Array[] = [];
    const half = frameSize / 2;

    for (let offset = 0; offset + frameSize <= data.length; offset += hop) {
      const re = new Float64Array(frameSize);
      const im = new Float64Array(frameSize);
      for (let i = 0; i < frameSize; i++) {
        const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (frameSize - 1));
        re[i] = data[offset + i] * w;
      }
      fftInPlace(re, im);
      const mags = new Float64Array(half);
      for (let i = 0; i < half; i++) mags[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
      frames.push(mags);
    }

    canvas.width = frames.length;
    canvas.height = half;
    const imageData = ctx.createImageData(canvas.width, canvas.height);

    let maxMag = 1e-6;
    for (const f of frames) for (const v of f) if (v > maxMag) maxMag = v;

    for (let x = 0; x < frames.length; x++) {
      const frame = frames[x];
      for (let y = 0; y < half; y++) {
        const mag = frame[half - 1 - y] / maxMag;
        const intensity = Math.min(1, Math.log10(1 + mag * 9));
        const idx = (y * canvas.width + x) * 4;
        // Accent-blue heat scale rather than a default grayscale/jet map.
        imageData.data[idx] = Math.round(20 + intensity * 40);
        imageData.data[idx + 1] = Math.round(30 + intensity * 120);
        imageData.data[idx + 2] = Math.round(60 + intensity * 195);
        imageData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [buffer]);

  return <canvas ref={canvasRef} className="h-32 w-full rounded-lg bg-background-elevated" style={{ imageRendering: "pixelated" }} />;
}

function fftInPlace(re: Float64Array, im: Float64Array) {
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
