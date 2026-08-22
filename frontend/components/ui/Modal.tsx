"use client";

import { useEffect } from "react";
import type { ModalProps } from "@/types/components";

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog overlay"
        className="absolute inset-0 bg-bg/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-surface p-4 shadow-xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          {title ? <h2 className="text-sm font-semibold text-fg">{title}</h2> : <span />}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-muted hover:bg-surface-2 hover:text-fg"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
