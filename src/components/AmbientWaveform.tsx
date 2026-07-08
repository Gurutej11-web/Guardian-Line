/** Decorative idle waveform — deliberately the same visual language as
 * the real AudioLevelBars meter used in the Live Monitor, so the
 * marketing page and the actual product don't feel like two different
 * designers. Bar heights follow a hand-tuned envelope (not random) so
 * the silhouette reads as a real waveform rather than noise, and each
 * bar's "breathing" animation is staggered so it settles instead of
 * ticking in lockstep. Server-renderable — no client JS needed. */

function buildEnvelope(count: number): number[] {
  const heights: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    // Two overlapping sine terms give a silhouette with a couple of
    // natural-looking "syllable" peaks rather than one uniform hump.
    const primary = Math.sin(t * Math.PI * 1.6 + 0.3);
    const detail = Math.sin(t * Math.PI * 5.2) * 0.35;
    const envelope = Math.abs(primary) * 0.7 + Math.abs(detail) * 0.3;
    heights.push(0.12 + envelope * 0.88);
  }
  return heights;
}

export function AmbientWaveform({ className = "", barCount = 56 }: { className?: string; barCount?: number }) {
  const heights = buildEnvelope(barCount);

  return (
    <div className={`flex items-end justify-center gap-[3px] ${className}`} aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          className="animate-wave-breathe w-[3px] shrink-0 rounded-full bg-accent"
          style={{
            height: `${Math.round(h * 100)}%`,
            animationDelay: `${(i % 14) * 110}ms`,
          }}
        />
      ))}
    </div>
  );
}
