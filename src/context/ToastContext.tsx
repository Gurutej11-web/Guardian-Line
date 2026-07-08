"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckIcon, XIcon } from "@/components/icons";

type ToastVariant = "default" | "success" | "danger";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantColor: Record<ToastVariant, string> = {
  default: "var(--accent)",
  success: "var(--trust-safe)",
  danger: "var(--trust-danger)",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = "default") => {
    const id = idRef.current++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-fade-in-up pointer-events-auto flex items-center gap-2.5 rounded-full border border-border-strong bg-background-card px-4 py-2.5 text-sm shadow-2xl"
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `color-mix(in srgb, ${variantColor[toast.variant]} 20%, transparent)` }}
            >
              <CheckIcon className="h-3 w-3" style={{ color: variantColor[toast.variant] }} />
            </span>
            <span className="text-foreground">{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className="ml-1 text-foreground-muted hover:text-foreground"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
