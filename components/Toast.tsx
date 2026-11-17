"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Check, ExternalLink, X } from "lucide-react";
import { SITE_URL } from "@/lib/site";

type Tone = "success" | "error";
interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
  /** Adds a "View on website" link (for changes that are now live). */
  live?: boolean;
}

interface ToastApi {
  success: (message: string, opts?: { live?: boolean }) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const SHOW_MS = 5000;

/**
 * Tells people a save or delete worked (or didn't) in plain words.
 * Announced to screen readers via the polite live region.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: Tone, live?: boolean) => {
      const id = nextId.current++;
      setItems((prev) => [...prev.slice(-2), { id, message, tone, live }]);
      setTimeout(() => dismiss(id), tone === "error" ? SHOW_MS * 2 : SHOW_MS);
    },
    [dismiss]
  );

  const api: ToastApi = {
    success: (message, opts) => push(message, "success", opts?.live),
    error: (message) => push(message, "error"),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`animate-toast-in pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
              t.tone === "success"
                ? "border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
            }`}
          >
            {t.tone === "success" ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            )}
            <div className="flex-1">
              <p>{t.message}</p>
              {t.live && (
                <a
                  href={SITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
                >
                  View on website
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss message"
              className="relative -m-1 rounded p-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white after:absolute after:-inset-2 after:content-['']"
            >
              <X className="h-4 w-4" aria-hidden />
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
