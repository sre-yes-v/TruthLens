/**
 * Progress indicators: the pipeline bar, sub-score bars, and the spinner.
 *
 * All of them carry ARIA progressbar semantics where a value is meaningful,
 * so the information is available to a screen reader and not only to sighted
 * users watching a blue bar grow.
 */
import { cn } from "@/lib/utils/cn";
import { TONE_FILL, type BadgeTone } from "./Badge";

export interface ProgressBarProps {
  /** 0–100. */
  value: number;
  /** Colour of the filled portion. Defaults to the primary blue. */
  tone?: BadgeTone;
  /** Track height in pixels — 6 for the pipeline bar, 8 for sub-scores. */
  height?: number;
  label: string;
  className?: string;
}

export function ProgressBar({
  value,
  tone = "neutral",
  height = 6,
  label,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      style={{ height }}
      className={cn(
        "w-full overflow-hidden rounded-full bg-divider-2",
        className,
      )}
    >
      <span
        className="block h-full rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${clamped}%`, background: TONE_FILL[tone] }}
      />
    </div>
  );
}

/** The prototype's spinning ring, used while sanitization runs. */
export function Spinner({
  size = 54,
  label = "Loading",
}: {
  size?: number;
  label?: string;
}) {
  const strokeWidth = size > 30 ? 5 : 3;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg
      width={size}
      height={size}
      role="status"
      aria-label={label}
      className="animate-spin-slow"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="var(--color-divider-2)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="var(--color-blue)"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        // A 35% arc — the same partial ring the prototype draws.
        strokeDasharray={circumference}
        strokeDashoffset={circumference * 0.65}
      />
    </svg>
  );
}
