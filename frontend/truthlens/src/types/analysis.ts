/**
 * The analysis pipeline as the frontend models it: nine steps, ten SSE
 * events, five per-step visual states.
 *
 * The prototype hard-codes nine <li> elements. Here the same nine steps
 * are data (see `lib/constants/analysis.ts`), so the stepper component is
 * a loop over a typed array rather than nine near-identical blocks.
 */

/**
 * The nine pipeline stages, in SRS order (FR-10.1).
 * These ids are ours; they map 1:1 onto the SSE event names below.
 */
export type AnalysisStepId =
  | "upload"
  | "metadata"
  | "ocr"
  | "privacy"
  | "forensics"
  | "ai_assessment"
  | "regional"
  | "scoring"
  | "report";

/**
 * Named SSE events emitted by `GET /api/v1/analyze/stream/{session_id}`
 * (SRS §9.2). `error` is the only one that is not a stage completion.
 */
export type AnalysisEventName =
  | "upload_received"
  | "metadata_done"
  | "ocr_done"
  | "privacy_done"
  | "forensics_done"
  | "ai_assessment_done"
  | "regional_done"
  | "scoring_done"
  | "report_ready"
  | "error";

/**
 * Visual state of a single step.
 *
 * `warning` is the one that matters forensically: UC-2's alternate flow and
 * NFR-2.1 say a failing engine must be marked unavailable and the pipeline
 * must continue. That is a warning, not a failure — the run still produces
 * a report, with the engine excluded from scoring.
 */
export type AnalysisStepState =
  | "pending"
  | "active"
  | "completed"
  | "warning"
  | "failed";

/** Static definition of one step. Never changes at runtime. */
export interface AnalysisStepDefinition {
  id: AnalysisStepId;
  /** Label shown in the stepper, taken verbatim from the prototype. */
  label: string;
  /** The SSE event that marks this step complete. */
  completedBy: AnalysisEventName;
}

/** A step definition plus its live state. This is what the UI renders. */
export interface AnalysisStep extends AnalysisStepDefinition {
  state: AnalysisStepState;
  /** Short status shown on the right, e.g. "done" / "running" / "unavailable". */
  note?: string;
}

/**
 * Payload of a stage-completion SSE event.
 * FR-10.2 requires a stage name, a timestamp, and a human-readable message.
 */
export interface AnalysisEventPayload {
  stage?: string;
  timestamp?: string;
  message?: string;
  /** Present on `report_ready` — this is what we navigate to. */
  report_id?: string;
  /**
   * Present when an engine degraded but the pipeline continued
   * (UC-2 alternate flow). Renders the step amber instead of blue.
   */
  degraded?: boolean;
  /** Present on `error` events. */
  error_code?: string;
}

/** A parsed SSE event: its name plus its decoded payload. */
export interface AnalysisEvent {
  name: AnalysisEventName;
  payload: AnalysisEventPayload;
}

/**
 * How progress is currently being received. Surfaced in the UI so the user
 * (and the examiner) can see the FR-10.4 fallback actually engage.
 */
export type AnalysisConnectionMode = "connecting" | "stream" | "polling";

/** Everything `useAnalysisStream` returns — the whole analysis screen state. */
export interface AnalysisState {
  steps: AnalysisStep[];
  /** 0–100, derived from how many steps have completed. */
  progress: number;
  /** The live status line, e.g. "Reading text (OCR)…". */
  statusMessage: string;
  connectionMode: AnalysisConnectionMode;
  /** Set once `report_ready` arrives. */
  reportId: string | null;
  /** Set when the pipeline stops without a report. */
  error: import("./errors").NormalizedApiError | null;
  isComplete: boolean;
}
