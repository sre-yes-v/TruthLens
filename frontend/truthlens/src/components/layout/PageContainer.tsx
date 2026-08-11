/**
 * The prototype's `.wrap` / `.wrap.wide` — the centred content column.
 *
 * Two widths, matching the prototype's `--maxw` (760px) for reading-width
 * screens and `--maxw-wide` (940px) for the report and admin screens, which
 * carry two-column content.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function PageContainer({
  width = "reading",
  className,
  children,
}: {
  width?: "reading" | "wide";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto px-5 pt-7 pb-24",
        width === "wide" ? "max-w-[940px]" : "max-w-[760px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The full-screen centred layout used by the "analysis failed" and
 * "report expired" states (the prototype's `.state-screen`).
 */
export function StateScreen({
  icon,
  tone,
  title,
  children,
  actions,
  code,
}: {
  icon: ReactNode;
  tone: "error" | "neutral";
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  /** Monospace footer, e.g. "session f9a2 · error: pipeline_incomplete". */
  code?: string;
}) {
  return (
    <div className="mx-auto max-w-[520px] px-5 py-20 text-center">
      <div
        aria-hidden="true"
        className={cn(
          "mx-auto mb-5 flex size-[66px] items-center justify-center rounded-full",
          tone === "error" ? "bg-red-bg text-red" : "bg-grey text-ink-2",
        )}
      >
        {icon}
      </div>

      <h1 className="text-2xl font-bold tracking-[-0.5px]">{title}</h1>
      <p className="mt-2 mb-6 text-ink-2">{children}</p>

      {actions && (
        <div className="flex flex-wrap justify-center gap-2.5">{actions}</div>
      )}

      {code && (
        <div className="mt-[18px] inline-block rounded-md bg-grey px-2.5 py-1 font-mono text-xs text-ink-2">
          {code}
        </div>
      )}
    </div>
  );
}
