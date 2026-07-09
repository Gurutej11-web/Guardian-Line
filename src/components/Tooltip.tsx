"use client";

import { useId, useState } from "react";

export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={id} tabIndex={0} className="cursor-help border-b border-dotted border-foreground-muted">
        {children}
      </span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="animate-fade-in pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-border-strong bg-background-elevated px-3 py-2 text-xs leading-relaxed text-foreground shadow-xl"
        >
          {text}
        </span>
      )}
    </span>
  );
}
