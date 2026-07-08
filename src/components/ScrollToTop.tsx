"use client";

import { useEffect, useState } from "react";
import { ArrowUpIcon } from "./icons";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className="btn-press animate-fade-in fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border-strong bg-background-card text-foreground-muted shadow-lg hover:border-accent hover:text-foreground"
    >
      <ArrowUpIcon className="h-4 w-4" />
    </button>
  );
}
