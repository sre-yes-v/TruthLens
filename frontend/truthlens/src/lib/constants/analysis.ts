/**
 * The nine pipeline steps, as data.
 *
 * The prototype writes nine near-identical <li> elements by hand. Here the
 * same nine steps are one array, so `AnalysisStepper` is a `.map()` and
 * adding or reordering a stage is a one-line edit rather than nine.
 *
 * Labels are taken verbatim from the prototype (its `STAGES` array) so the
 * production UI reads exactly like the approved design.
 */
import type {
  AnalysisEventName,
  AnalysisStepDefinition,
  AnalysisStepId,
} from "@/types/analysis";

export const ANALYSIS_STEPS: readonly AnalysisStepDefinition[] = [
  { id: "upload", label: "Upload received", completedBy: "upload_received" },
  { id: "metadata", label: "Reading metadata", completedBy: "metadata_done" },
  { id: "ocr", label: "Reading text (OCR)", completedBy: "ocr_done" },
  {
    id: "privacy",
    label: "Detecting sensitive objects",
    completedBy: "privacy_done",
  },
  {
    id: "forensics",
    label: "Checking for manipulation",
    completedBy: "forensics_done",
  },
  {
    id: "ai_assessment",
    label: "Estimating AI generation",
    completedBy: "ai_assessment_done",
  },
  { id: "regional", label: "Inferring region", completedBy: "regional_done" },
  { id: "scoring", label: "Scoring authenticity", completedBy: "scoring_done" },
  { id: "report", label: "Preparing report", completedBy: "report_ready" },
] as const;

export const TOTAL_ANALYSIS_STEPS = ANALYSIS_STEPS.length;

/** Reverse lookup: which step does this SSE event complete? */
const STEP_BY_EVENT = new Map<AnalysisEventName, AnalysisStepId>(
  ANALYSIS_STEPS.map((step) => [step.completedBy, step.id]),
);

export function stepIdForEvent(
  event: AnalysisEventName,
): AnalysisStepId | undefined {
  return STEP_BY_EVENT.get(event);
}

/**
 * Maps the `stage` string from `GET /analyze/status/{id}` onto a step.
 *
 * The polling fallback reports a stage name rather than an event name, and
 * SRS §9.1 doesn't fix its exact spelling. We accept both forms — "ocr" and
 * "ocr_done" — so the fallback keeps working whichever the backend sends.
 */
export function stepIdForStage(stage: string): AnalysisStepId | undefined {
  const normalized = stage.trim().toLowerCase();
  const direct = ANALYSIS_STEPS.find((step) => step.id === normalized);
  if (direct) return direct.id;
  return STEP_BY_EVENT.get(normalized as AnalysisEventName);
}

/** Index of a step, for "how far along are we" calculations. */
export function stepIndex(id: AnalysisStepId): number {
  return ANALYSIS_STEPS.findIndex((step) => step.id === id);
}

/** NFR-1.1: a typical run finishes well inside this. Used for copy only. */
export const EXPECTED_PIPELINE_SECONDS = 30;

/** UC-3 alternate flow: poll the status endpoint every 3 seconds. */
export const POLL_INTERVAL_MS = 3000;

/** FR-10.5: give up after the configured maximum pipeline duration. */
export const MAX_PIPELINE_MS = 120_000;
