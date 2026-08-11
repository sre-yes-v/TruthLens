/**
 * Small coloured labels: the prototype's `.tag`, `.acc-tag` / `.band-*`,
 * and `.ev-conf`.
 *
 * All three share one semantic scale — low → moderate → high → critical —
 * so they share one `tone` prop. That keeps green/amber/orange/red meaning
 * the same thing everywhere in the report, which matters when a user is
 * scanning for what to worry about.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { PrivacyBand, RiskLevel } from "@/types/report";

export type BadgeTone = "low" | "moderate" | "high" | "critical" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  low: "bg-green-bg text-green",
  moderate: "bg-amber-bg text-amber-ink-2",
  high: "bg-orange-bg text-orange",
  critical: "bg-red-bg text-red",
  neutral: "bg-grey text-ink-2",
};

/** The pill used in accordion headers and next to sub-scores. */
export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-[3px] text-xs font-semibold",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * The prototype's `.tag` — the small uppercase category chip that prefixes
 * a finding, e.g. "phone", "obj", "privacy".
 */
export function Tag({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mt-px shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-[0.3px] uppercase",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------
   Score → colour. Defined once, here, so the whole report agrees on what
   counts as "bad". The thresholds are FR-4.7's privacy bands and FR-9.3's
   risk levels — not arbitrary design choices.
   ------------------------------------------------------------------ */

export function toneForPrivacyBand(band: PrivacyBand): BadgeTone {
  switch (band) {
    case "Critical":
      return "critical";
    case "High":
      return "high";
    case "Moderate":
      return "moderate";
    default:
      return "low";
  }
}

export function toneForRiskLevel(level: RiskLevel): BadgeTone {
  switch (level) {
    case "Likely Authentic":
      return "low";
    case "Low Concern":
      return "moderate";
    case "Moderate Concern":
      return "high";
    default:
      return "critical";
  }
}

/**
 * Tone for a plain 0–100 "how suspicious is this" score (forensic suspicion,
 * AI probability). Uses the same band boundaries as FR-4.7 so a 45 means the
 * same shade of amber wherever it appears.
 */
export function toneForScore(value: number): BadgeTone {
  if (value >= 86) return "critical";
  if (value >= 61) return "high";
  if (value >= 31) return "moderate";
  return "low";
}

/** The CSS colour for a tone's solid fill — used by progress bars and dots. */
export const TONE_FILL: Record<BadgeTone, string> = {
  low: "var(--color-green)",
  moderate: "var(--color-amber)",
  high: "var(--color-orange)",
  critical: "var(--color-red)",
  neutral: "var(--color-blue)",
};
