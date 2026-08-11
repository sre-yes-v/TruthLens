/**
 * The prototype's `.banner` — an inline message block in one of four tones.
 *
 * Used for upload validation errors, the "insufficient regional evidence"
 * notice, and network failures. Errors get `role="alert"` so a screen reader
 * announces them the moment they appear; softer tones do not, to avoid
 * interrupting the user for informational text.
 */
import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type BannerTone = "error" | "warning" | "info" | "success";

const TONE_CLASSES: Record<BannerTone, string> = {
  error: "bg-red-bg text-red-ink",
  warning: "bg-amber-bg text-amber-ink",
  info: "bg-blue-tint text-[#0a4bad]",
  success: "bg-green-bg text-green-ink",
};

const TONE_ICONS: Record<BannerTone, typeof Info> = {
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
  success: CheckCircle2,
};

export interface BannerProps {
  tone?: BannerTone;
  /** Bold lead-in sentence, rendered before the body. */
  title?: string;
  children?: ReactNode;
  className?: string;
}

export function Banner({
  tone = "info",
  title,
  children,
  className,
}: BannerProps) {
  const Icon = TONE_ICONS[tone];

  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "flex items-start gap-[11px] rounded-card px-[15px] py-[13px] text-sm",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-px size-5 shrink-0" />
      <div>
        {title && <b className="font-bold">{title}</b>}
        {title && children ? " " : null}
        {children}
      </div>
    </div>
  );
}

/**
 * The prototype's `.degraded` block — shown inside a report section whose
 * engine failed.
 *
 * This is a distinct component rather than a warning Banner because it says
 * something specific and important: the engine did not run, so this section
 * is not "nothing found" (NFR-2.1, UC-2 alternate flow). Conflating the two
 * would be a factual error in a forensic report.
 */
export function DegradedNotice({ reason }: { reason: string }) {
  return (
    <div className="flex items-start gap-[11px] rounded-card border border-[#f3d999] bg-amber-bg p-3.5 text-sm text-amber-ink">
      <TriangleAlert aria-hidden="true" className="mt-px size-[18px] shrink-0" />
      <div>
        <b className="font-bold">This check couldn&apos;t run on this image.</b>
        <br />
        {reason}
      </div>
    </div>
  );
}

/**
 * The prototype's `.mini-disc` — a quiet caveat under a section's content.
 * Used where the SRS requires a standing limitation to be visible
 * (FR-7.6 probabilistic framing, FR-8.8 "not GPS geolocation").
 */
export function MiniDisclaimer({
  icon,
  children,
}: {
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mt-3.5 flex items-start gap-2.5 rounded-card border border-divider-2 bg-[#F7F8FA] px-3.5 py-3 text-[13px] text-ink-2">
      <span aria-hidden="true" className="mt-px shrink-0">
        {icon ?? <Info className="size-4" />}
      </span>
      <div>{children}</div>
    </div>
  );
}
