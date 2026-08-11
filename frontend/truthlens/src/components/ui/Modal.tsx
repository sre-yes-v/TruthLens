"use client";

/**
 * An accessible dialog — the prototype's `.overlay` + `.modal`.
 *
 * The prototype toggles a CSS class and stops there. A real dialog has four
 * more obligations, all implemented below, because without them a keyboard
 * or screen-reader user simply cannot use it:
 *
 *   1. Focus moves into the dialog when it opens, and returns to whatever
 *      opened it when it closes.
 *   2. Tab is trapped inside — you cannot tab onto the page behind.
 *   3. Escape closes it.
 *   4. `role="dialog"` + `aria-modal` + `aria-labelledby` tell assistive
 *      technology that the rest of the page is inert and what this is.
 *
 * Body scrolling is locked while open so the page behind doesn't drift.
 */
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./Button";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      // Wrap focus around the ends of the dialog instead of escaping it.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Move focus into the dialog so the next Tab stays inside it.
    const firstFocusable =
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      // Return focus to the trigger, so the user isn't dumped at the top
      // of the document after closing.
      previouslyFocused.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-5"
      // Clicking the backdrop closes; clicking inside the panel must not,
      // hence the target check.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[460px] overflow-hidden rounded-modal bg-card shadow-lift"
      >
        <div className="flex items-center justify-between border-b border-divider-2 px-5 py-[18px]">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/**
 * The prototype's `.opt-row` — a large clickable choice inside a modal,
 * used by the download dialog. A <button> so Enter and Space work.
 */
export function ModalOption({
  icon,
  title,
  description,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mb-2.5 flex w-full items-center gap-3.5 rounded-card border border-divider-2 p-3.5 text-left transition-colors duration-100 hover:border-blue hover:bg-blue-wash disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-divider-2 disabled:hover:bg-transparent"
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-blue-tint text-blue"
      >
        {icon}
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-[13px] text-ink-2">{description}</span>
      </span>
    </button>
  );
}
