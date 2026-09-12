"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";

export type ToastType = "info" | "success" | "warning" | "error" | "conflict";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", durationMs = 4500) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      if (durationMs > 0) {
        setTimeout(() => {
          removeToast(id);
        }, durationMs);
      }
    },
    [removeToast]
  );

  // Listen to custom window events from api.ts or other non-component modules
  useEffect(() => {
    function handleEvent(e: Event) {
      const customEvent = e as CustomEvent<{ message: string; type?: ToastType }>;
      if (customEvent.detail && customEvent.detail.message) {
        showToast(customEvent.detail.message, customEvent.detail.type || "info");
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("collabboard-toast", handleEvent);
      return () => window.removeEventListener("collabboard-toast", handleEvent);
    }
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          const isError = toast.type === "error";
          const isConflict = toast.type === "conflict";
          const isSuccess = toast.type === "success";
          const isWarning = toast.type === "warning";

          const bgBorderClass = isError
            ? "border-red-500/40 bg-red-950/90 text-red-200"
            : isConflict
            ? "border-amber-500/40 bg-amber-950/90 text-amber-200"
            : isSuccess
            ? "border-emerald-500/40 bg-emerald-950/90 text-emerald-200"
            : isWarning
            ? "border-yellow-500/40 bg-yellow-950/90 text-yellow-200"
            : "border-border bg-surface-2/95 text-fg";

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border p-3.5 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 ${bgBorderClass}`}
            >
              <div className="shrink-0 mt-0.5">
                {isError && <AlertCircle className="h-4 w-4 text-red-400" />}
                {isConflict && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                {isSuccess && <CheckCircle className="h-4 w-4 text-emerald-400" />}
                {isWarning && <AlertTriangle className="h-4 w-4 text-yellow-400" />}
                {!isError && !isConflict && !isSuccess && !isWarning && (
                  <Info className="h-4 w-4 text-accent" />
                )}
              </div>
              <p className="flex-1 text-xs font-medium leading-relaxed">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded p-1 text-muted hover:text-fg hover:bg-surface/50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Dispatch toast notification from anywhere (including api.ts)
 */
export function emitToast(message: string, type: ToastType = "info") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("collabboard-toast", { detail: { message, type } })
    );
  }
}
