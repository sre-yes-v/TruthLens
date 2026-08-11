"use client";

/**
 * Toast notifications — the prototype's `.toast`.
 *
 * This is the ONE piece of global state in the app, and it earns it: a
 * download button on the report page and a delete action in a modal both
 * need to show the same confirmation strip, and neither owns the other.
 * Everything else (upload state, analysis progress, report data) belongs to
 * a single route and stays in local state or the URL.
 *
 * Implemented with React context — about 50 lines, no dependency. Reaching
 * for Redux or Zustand to hold one string would be the definition of
 * over-engineering.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ToastTone = "success" | "error";

interface ToastMessage {
  id: number;
  text: string;
  tone: ToastTone;
}

interface ToastContextValue {
  /** Shows a confirmation, e.g. "Report downloaded". */
  toast: (text: string) => void;
  /** Shows a failure, e.g. "Download failed". */
  toastError: (text: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VISIBLE_MS = 2400;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const nextId = useRef(0);

  const show = useCallback((text: string, tone: ToastTone) => {
    nextId.current += 1;
    setMessage({ id: nextId.current, text, tone });

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), VISIBLE_MS);
  }, []);

  // Clear the pending timer if the provider unmounts mid-toast.
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const toast = useCallback((text: string) => show(text, "success"), [show]);
  const toastError = useCallback((text: string) => show(text, "error"), [show]);

  return (
    <ToastContext.Provider value={{ toast, toastError }}>
      {children}

      {/*
        `aria-live="polite"` announces the message without interrupting what
        the user is doing. The container is always rendered so assistive tech
        is already watching it when a message arrives — a live region added
        at the same moment as its content is often missed.
      */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-7 left-1/2 z-80 -translate-x-1/2"
      >
        {message && (
          <div
            key={message.id}
            className={cn(
              "flex items-center gap-2.5 rounded-card px-5 py-[13px] text-sm font-medium text-white shadow-lift",
              message.tone === "error" ? "bg-red" : "bg-ink",
            )}
          >
            {message.tone === "error" ? (
              <TriangleAlert aria-hidden="true" className="size-4" />
            ) : (
              <Check aria-hidden="true" className="size-4 text-[#5ad07f]" />
            )}
            {message.text}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    // A clear error beats a silent no-op: this means ToastProvider is
    // missing from the layout.
    throw new Error("useToast must be used inside a <ToastProvider>.");
  }
  return context;
}
