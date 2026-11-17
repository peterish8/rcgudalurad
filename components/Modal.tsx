"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Wider panel for long forms (events, ads). */
  size?: "md" | "lg";
  /** Element to focus when the dialog opens (defaults to the first field or button). */
  initialFocus?: React.RefObject<HTMLElement | null>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: Esc closes, focus moves inside and stays there,
 * and returns to whatever opened it when it closes.
 */
export function Modal({ isOpen, onClose, title, children, size = "md", initialFocus }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    // Focus the first field (or the requested element) once the panel is in the DOM.
    // setTimeout, not requestAnimationFrame: rAF doesn't run in background tabs.
    const focusTimer = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target =
        initialFocus?.current ??
        panel.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select") ??
        panel.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus?.();
    };
  }, [isOpen, initialFocus]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
        <div
          className="animate-scrim-in fixed inset-0 bg-gray-900/50"
          onClick={onClose}
          aria-hidden
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`animate-dialog-in relative w-full rounded-xl border border-gray-200 bg-white text-left shadow-xl dark:border-gray-700 dark:bg-gray-800 ${
            size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"
          }`}
        >
          <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="btn -mr-2 h-10 w-10 px-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="px-5 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
