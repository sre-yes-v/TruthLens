/**
 * The prototype's `.card` — white surface, 10px radius, subtle shadow.
 *
 * A component rather than a repeated class string so the surface treatment
 * is defined once. `as` lets a card be a <section> or <li> when that is the
 * correct element, without losing the styling.
 */
import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Applies the prototype's `.pad` (22px). */
  padded?: boolean;
  as?: ElementType;
  children?: ReactNode;
}

export function Card({
  padded = false,
  as: Component = "div",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Component
      {...props}
      className={cn(
        "rounded-card bg-card shadow-card",
        padded && "p-[22px]",
        className,
      )}
    >
      {children}
    </Component>
  );
}

/**
 * The prototype's `.field-label` — the small uppercase caption above a
 * block of report content.
 */
export function FieldLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-2 text-xs font-bold tracking-[0.4px] text-ink-3 uppercase",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The prototype's `.eyebrow` — small uppercase label above a heading. */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-xs font-bold tracking-[0.6px] text-ink-2 uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}
