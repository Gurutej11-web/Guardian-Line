"use client";

import { useEffect, useRef } from "react";

interface AudioLevelBarsProps {
  analyser: AnalyserNode | null;
  barCount?: number;
  className?: string;
}

/** Real-time bar visualizer driven directly by the live microphone's
 * AnalyserNode — mutates bar heights via refs on every animation frame
 * rather than through React state, since re-rendering at 60fps would be
 * wasteful for what's purely a visual flourish. */
export function AudioLevelBars({ analyser, barCount = 28, className = "" }: AudioLevelBarsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const step = Math.max(1, Math.floor(data.length / barCount));

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const bars = containerRef.current?.children;
      if (bars) {
        for (let i = 0; i < barCount; i++) {
          const value = data[i * step] / 255;
          const bar = bars[i] as HTMLDivElement | undefined;
          if (bar) bar.style.transform = `scaleY(${Math.max(0.05, value)})`;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, barCount]);

  return (
    <div ref={containerRef} className={`flex h-10 items-end gap-[3px] ${className}`}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className="w-1 flex-1 origin-bottom rounded-full bg-accent transition-transform duration-75"
          style={{ height: "100%", transform: "scaleY(0.05)" }}
        />
      ))}
    </div>
  );
}
