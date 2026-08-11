/**
 * A fake SSE stream — replays the nine pipeline events on a timer.
 *
 * This is what makes the analysis screen developable without a backend.
 * It satisfies the same `openAnalysisStream` signature as the real one in
 * `lib/sse/analysisStream.ts`, so the hook consuming it cannot tell the
 * difference — which is also the point: if the fake works and the real one
 * doesn't, the bug is in the network layer, not in the UI.
 *
 * Three paths, chosen by session id:
 *   • normal    — all nine events, then report_ready
 *   • degraded  — one engine reports `degraded: true`, pipeline continues
 *   • failed    — stops at forensics and emits `error`
 */
import { ANALYSIS_STEPS } from "@/lib/constants/analysis";
import type { AnalysisStreamHandlers, CloseStream } from "@/lib/api/contract";
import { mockCaseBySessionId } from "./reports";

/** Sessions with this prefix take the total-failure path. */
export const MOCK_FAILING_SESSION_PREFIX = "fail-";

/** Milliseconds between simulated stages. Roughly the prototype's pacing. */
const STEP_DELAY_MS = 460;

export function openMockAnalysisStream(
  sessionId: string,
  handlers: AnalysisStreamHandlers,
): CloseStream {
  const shouldFail = sessionId.startsWith(MOCK_FAILING_SESSION_PREFIX);
  const degradedStep = mockCaseBySessionId(sessionId)?.degradedStep;
  const reportId = mockCaseBySessionId(sessionId)?.report.report_id ?? `rep-${sessionId}`;

  let index = 0;
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const emitNext = () => {
    if (cancelled) return;

    const step = ANALYSIS_STEPS[index];

    // Total pipeline failure: stop at the manipulation check, as the
    // prototype's "Analysis failed" demo does.
    if (shouldFail && step.id === "forensics") {
      handlers.onEvent({
        name: "error",
        payload: {
          stage: step.id,
          timestamp: new Date().toISOString(),
          message:
            "The image was read successfully, but the analysis pipeline stopped during the manipulation check and no report was produced. This is usually temporary — try the same image again, or a different one.",
          error_code: "pipeline_incomplete",
        },
      });
      return;
    }

    handlers.onEvent({
      name: step.completedBy,
      payload: {
        stage: step.id,
        timestamp: new Date().toISOString(),
        message: step.label,
        // A degraded engine still completes the step — amber, not red.
        degraded: step.id === degradedStep,
        ...(step.completedBy === "report_ready" ? { report_id: reportId } : {}),
      },
    });

    index += 1;
    if (index < ANALYSIS_STEPS.length) {
      timer = setTimeout(emitNext, STEP_DELAY_MS);
    }
  };

  timer = setTimeout(emitNext, STEP_DELAY_MS);

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}
