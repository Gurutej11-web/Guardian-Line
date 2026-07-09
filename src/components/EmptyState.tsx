export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
      <svg viewBox="0 0 120 120" className="h-24 w-24 text-foreground-muted opacity-60">
        <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 8" />
        <path
          d="M42 66c0-10 8-18 18-18s18 8 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="60" cy="42" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M30 84h60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      </svg>
      <div>
        <div className="font-medium">{title}</div>
        <p className="mt-1 max-w-xs text-sm text-foreground-muted">{description}</p>
      </div>
    </div>
  );
}
