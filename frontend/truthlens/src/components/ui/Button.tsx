/**
 * The prototype's `.btn` in component form.
 *
 * Every button style in the design is a combination of one variant and one
 * size, so those are props rather than 20 separate CSS classes. It renders a
 * real <button>, which means keyboard activation, focus rings and disabled
 * semantics come free — a styled <div> would have to reimplement all three.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "default" | "primary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default: "bg-grey text-ink hover:bg-grey-hover",
  primary: "bg-blue text-white hover:bg-blue-hover active:bg-blue-press",
  ghost: "bg-transparent text-ink-2 hover:bg-grey",
  danger: "bg-red text-white hover:brightness-95",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-[13px]",
  md: "px-4 py-[9px] text-[15px]",
  lg: "px-[22px] py-[13px] text-base",
};

/**
 * The class string for a button's appearance.
 *
 * Exported because some "buttons" in the design are navigation and must be
 * real links — "New analysis", "Back to report". Wrapping a <Link> in a
 * <button> would be invalid HTML and would break middle-click, open-in-new-tab
 * and the browser's own link handling. Those render `<Link className={buttonClasses(...)}>`
 * instead, and look identical.
 */
export function buttonClasses({
  variant = "default",
  size = "md",
  disabled = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
} = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-btn font-semibold whitespace-nowrap",
    "transition-colors duration-100",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    disabled &&
      "cursor-not-allowed bg-grey text-ink-3 hover:bg-grey active:bg-grey",
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders a spinner and blocks clicks. Keeps the label for stable width. */
  loading?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "default",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      // Screen readers are told the button is busy, not just unclickable.
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, disabled: isDisabled, className })}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin-slow rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}

/**
 * The prototype's `.icon-btn` — a round button holding a single icon.
 * `label` is required because an icon-only button is invisible to a screen
 * reader without one.
 */
export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
  children: ReactNode;
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      aria-label={label}
      className={cn(
        "inline-flex size-[38px] shrink-0 items-center justify-center rounded-full",
        "bg-grey text-ink transition-colors duration-100 hover:bg-grey-hover",
        "disabled:cursor-not-allowed disabled:text-ink-3",
        className,
      )}
    >
      {children}
    </button>
  );
}
