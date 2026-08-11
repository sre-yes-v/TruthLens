"use client";

/**
 * The Authenticity Score ring — the first thing a user looks at.
 *
 * Two SVG circles: a grey track and a blue arc whose `stroke-dashoffset`
 * encodes the score. Animating from empty to the score on mount is the
 * prototype's behaviour; it is skipped entirely when the user has asked for
 * reduced motion, because a spinning number is exactly the kind of movement
 * that setting exists to suppress.
 *
 * The number is also written out as text, so the score is never conveyed by
 * the arc alone.
 */
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export interface ScoreRingProps {
  /** 0–100. */
  score: number;
  size?: number;
  strokeWidth?: number;
  /** Accessible description, e.g. "Authenticity score". */
  label: string;
}

export function ScoreRing({
  score,
  size = 150,
  strokeWidth = 14,
  label,
}: ScoreRingProps) {
  const reduceMotion = usePrefersReducedMotion();
  const radius = (size - strokeWidth) / 2 - 3;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));

  // The ring starts empty and fills on the next animation frame, so the
  // browser has a start value to animate from. The state update happens
  // inside the rAF callback rather than in the effect body — an effect that
  // sets state synchronously just causes an extra render.
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDisplayed(clamped));
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  // With reduced motion the final value is used directly on the first paint,
  // so there is nothing to animate.
  const shown = reduceMotion ? clamped : displayed;
  const offset = circumference - (shown / 100) * circumference;

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${Math.round(clamped)} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
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
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: reduceMotion
              ? undefined
              : "stroke-dashoffset 0.7s ease",
          }}
        />
      </svg>

      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        aria-hidden="true"
      >
        <b className="text-[40px] leading-none font-bold tracking-[-1px]">
          {Math.round(clamped)}
        </b>
        <span className="mt-[3px] text-xs text-ink-3">/ 100</span>
      </div>
    </div>
  );
}
