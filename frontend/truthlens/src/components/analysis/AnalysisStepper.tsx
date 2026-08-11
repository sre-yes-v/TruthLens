/**
 * The nine-step pipeline list — the prototype's `.steps`.
 *
 * A `.map()` over typed step data, not nine hand-written rows. Each step's
 * marker is chosen purely by its state, so adding a stage means editing
 * `lib/constants/analysis.ts` and nothing here.
 *
 * The list carries `aria-live="polite"`: as steps complete, a screen reader
 * announces the change without the user having to go looking for it.
 */
import { Check, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { AnalysisStep, AnalysisStepState } from "@/types/analysis";

const ROW_CLASSES: Record<AnalysisStepState, string> = {
  pending: "text-ink-2",
  active: "bg-blue-wash text-ink",
  completed: "text-ink",
  warning: "text-ink",
  failed: "text-ink",
};

function StepMarker({ state }: { state: AnalysisStepState }) {
  const base =
    "flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs transition-all duration-200";

  switch (state) {
    case "completed":
      return (
        <span className={cn(base, "border-blue bg-blue text-white")}>
          <Check aria-hidden="true" className="size-3.5" />
        </span>
      );
    case "warning":
      return (
        <span className={cn(base, "border-amber bg-amber text-white")}>
          <TriangleAlert aria-hidden="true" className="size-3" />
        </span>
      );
    case "failed":
      return (
        <span className={cn(base, "border-red bg-red text-white")}>
          <X aria-hidden="true" className="size-3.5" />
        </span>
      );
    case "active":
      return (
        // A rotating ring with one transparent edge — the prototype's spinner.
        <span
          className={cn(
            base,
            "animate-spin-slow border-blue border-t-transparent bg-white",
          )}
        />
      );
    default:
      return <span className={cn(base, "border-divider bg-white text-ink-3")} />;
  }
}

export function AnalysisStepper({ steps }: { steps: AnalysisStep[] }) {
  return (
    <ol
      aria-live="polite"
      aria-label="Analysis progress"
      className="m-0 flex list-none flex-col gap-0.5 p-0"
    >
      {steps.map((step) => (
        <li
          key={step.id}
          className={cn(
            "flex items-center gap-3 rounded-btn px-2 py-[11px]",
            ROW_CLASSES[step.state],
          )}
        >
          <StepMarker state={step.state} />
          <span className="flex-1">{step.label}</span>
          {step.note && (
            <span className="text-[12.5px] text-ink-3">{step.note}</span>
          )}
        </li>
      ))}
    </ol>
  );
}
