"use client";

/**
 * The live analysis screen's brain (UC-3, FR-10.x).
 *
 * It does three things:
 *   1. Opens the SSE stream and folds each event into the stepper's state.
 *   2. Falls back to polling when the stream drops (FR-10.4).
 *   3. Gives up after the maximum pipeline duration (FR-10.5).
 *
 * WHY A REDUCER
 * Nine events, two transports and a timeout all mutate the same state. A
 * reducer collects every one of those transitions into a single function you
 * can read top to bottom — instead of six `setState` calls scattered across
 * callbacks that can interleave in surprising ways.
 *
 * The key design point: SSE events and poll results are translated into the
 * SAME actions. The UI genuinely cannot tell which transport is feeding it,
 * so there is only one rendering path to get right.
 */
import { useEffect, useReducer, useRef } from "react";
import { api } from "@/lib/api";
import {
  ANALYSIS_STEPS,
  MAX_PIPELINE_MS,
  POLL_INTERVAL_MS,
  stepIdForEvent,
  stepIdForStage,
} from "@/lib/constants/analysis";
import { CLIENT_ERROR_CODES } from "@/types/api";
import { normalizeError } from "@/lib/utils/errors";
import type {
  AnalysisConnectionMode,
  AnalysisEvent,
  AnalysisState,
  AnalysisStep,
  AnalysisStepId,
} from "@/types/analysis";
import type { NormalizedApiError } from "@/types/errors";

/* ================================================================
   Actions — everything that can change the analysis screen
   ================================================================ */

type Action =
  | { type: "step_completed"; stepId: AnalysisStepId; degraded: boolean }
  | { type: "report_ready"; reportId: string; degraded: boolean }
  | { type: "pipeline_error"; error: NormalizedApiError }
  | { type: "connection_mode"; mode: AnalysisConnectionMode }
  /** From the polling fallback: "the backend says it is at this stage". */
  | { type: "sync_to_stage"; stepId: AnalysisStepId; message?: string };

/* ================================================================
   Initial state
   ================================================================ */

function initialState(): AnalysisState {
  return {
    steps: ANALYSIS_STEPS.map((step, index) => ({
      ...step,
      // The first step is already running when the page opens: the upload
      // completed, which is what produced the session id in the URL.
      state: index === 0 ? "active" : "pending",
    })),
    progress: 0,
    statusMessage: "Starting…",
    connectionMode: "connecting",
    reportId: null,
    error: null,
    isComplete: false,
  };
}

/* ================================================================
   Helpers
   ================================================================ */

const indexOfStep = (id: AnalysisStepId) =>
  ANALYSIS_STEPS.findIndex((step) => step.id === id);

/**
 * Marks every step up to and including `completedIndex` as finished, and the
 * next one as running.
 *
 * Written as "set the state of all steps" rather than "advance by one" on
 * purpose: SSE events can be missed during a reconnect, and the polling
 * fallback reports an absolute stage. Recomputing from an index makes both
 * paths self-correcting — a missed event heals on the next one.
 */
function advanceTo(
  steps: AnalysisStep[],
  completedIndex: number,
  degradedIndex: number | null,
): AnalysisStep[] {
  return steps.map((step, index) => {
    if (index === degradedIndex) {
      // NFR-2.1: the engine failed but the pipeline continued. Amber, with
      // a note — not a green tick, and not a red failure.
      return { ...step, state: "warning" as const, note: "unavailable" };
    }
    if (index <= completedIndex) {
      // Don't overwrite an earlier degraded marker on a later re-sync.
      if (step.state === "warning") return step;
      return { ...step, state: "completed" as const, note: "done" };
    }
    if (index === completedIndex + 1) {
      return { ...step, state: "active" as const, note: "running" };
    }
    return { ...step, state: "pending" as const, note: undefined };
  });
}

const progressFor = (completedIndex: number) =>
  Math.round(((completedIndex + 1) / ANALYSIS_STEPS.length) * 100);

/* ================================================================
   Reducer
   ================================================================ */

function reducer(state: AnalysisState, action: Action): AnalysisState {
  switch (action.type) {
    case "step_completed": {
      const index = indexOfStep(action.stepId);
      if (index < 0) return state;

      const steps = advanceTo(
        state.steps,
        index,
        action.degraded ? index : null,
      );
      const next = ANALYSIS_STEPS[index + 1];

      return {
        ...state,
        steps,
        progress: progressFor(index),
        statusMessage: next ? `${next.label}…` : "Preparing report…",
      };
    }

    case "report_ready": {
      const lastIndex = ANALYSIS_STEPS.length - 1;
      return {
        ...state,
        steps: advanceTo(state.steps, lastIndex, null).map((step) =>
          step.state === "warning" ? step : { ...step, state: "completed", note: "done" },
        ),
        progress: 100,
        statusMessage: "Report ready",
        reportId: action.reportId,
        isComplete: true,
        error: null,
      };
    }

    case "pipeline_error": {
      // Whatever step was running is the one that failed.
      const steps = state.steps.map((step) =>
        step.state === "active"
          ? { ...step, state: "failed" as const, note: "failed" }
          : step,
      );
      return {
        ...state,
        steps,
        statusMessage: "Something went wrong…",
        error: action.error,
        isComplete: true,
      };
    }

    case "connection_mode":
      return { ...state, connectionMode: action.mode };

    case "sync_to_stage": {
      const index = indexOfStep(action.stepId);
      if (index < 0) return state;
      // Never move backwards: a poll arriving late must not undo progress
      // the stream already reported.
      const currentIndex = state.steps.findIndex(
        (step) => step.state === "active",
      );
      if (currentIndex > index + 1) return state;

      return {
        ...state,
        steps: advanceTo(state.steps, index, null),
        progress: progressFor(index),
        statusMessage: action.message ?? state.statusMessage,
      };
    }

    default:
      return state;
  }
}

/* ================================================================
   The hook
   ================================================================ */

export function useAnalysisStream(sessionId: string): AnalysisState {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  // Held in refs so the effect below can clean them up without re-running
  // every time one of them changes.
  const closeStreamRef = useRef<(() => void) | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    finishedRef.current = false;

    const stopEverything = () => {
      finishedRef.current = true;
      closeStreamRef.current?.();
      closeStreamRef.current = null;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
      if (deadlineRef.current) clearTimeout(deadlineRef.current);
      deadlineRef.current = null;
    };

    /* ---------- translate one SSE event into an action ---------- */
    const handleEvent = (event: AnalysisEvent) => {
      if (finishedRef.current) return;
      dispatch({ type: "connection_mode", mode: "stream" });

      if (event.name === "error") {
        dispatch({
          type: "pipeline_error",
          error: {
            error_code: event.payload.error_code ?? "pipeline_incomplete",
            message:
              event.payload.message ??
              "The analysis pipeline stopped before finishing.",
            session_id: sessionId,
            status: null,
          },
        });
        stopEverything();
        return;
      }

      if (event.name === "report_ready") {
        const reportId = event.payload.report_id;
        if (!reportId) {
          // report_ready without an id means we cannot show the report.
          // Better to say so than to navigate somewhere broken.
          dispatch({
            type: "pipeline_error",
            error: {
              error_code: "missing_report_id",
              message:
                "The analysis finished but no report reference was returned.",
              session_id: sessionId,
              status: null,
            },
          });
        } else {
          dispatch({
            type: "report_ready",
            reportId,
            degraded: Boolean(event.payload.degraded),
          });
        }
        stopEverything();
        return;
      }

      const stepId = stepIdForEvent(event.name);
      if (stepId) {
        dispatch({
          type: "step_completed",
          stepId,
          degraded: Boolean(event.payload.degraded),
        });
      }
    };

    /* ---------- the FR-10.4 polling fallback ---------- */
    const startPolling = () => {
      if (finishedRef.current || pollTimerRef.current) return;
      dispatch({ type: "connection_mode", mode: "polling" });

      const pollOnce = async () => {
        if (finishedRef.current) return;
        try {
          const status = await api.getAnalysisStatus(sessionId);

          if (status.status === "failed") {
            dispatch({
              type: "pipeline_error",
              error: {
                error_code: "pipeline_incomplete",
                message:
                  status.message ??
                  "The analysis pipeline stopped before finishing.",
                session_id: sessionId,
                status: null,
              },
            });
            stopEverything();
            return;
          }

          if (status.report_id) {
            dispatch({
              type: "report_ready",
              reportId: status.report_id,
              degraded: false,
            });
            stopEverything();
            return;
          }

          const stepId = stepIdForStage(status.stage);
          if (stepId) {
            dispatch({ type: "sync_to_stage", stepId, message: status.message });
          }
        } catch (error) {
          // A failed poll is not fatal — the backend may be busy. We keep
          // polling until the FR-10.5 deadline, which is what ends this.
          const normalized = normalizeError(error);
          if (normalized.error_code === CLIENT_ERROR_CODES.ABORTED) return;
        }
      };

      void pollOnce(); // Don't wait 3s for the first result.
      pollTimerRef.current = setInterval(pollOnce, POLL_INTERVAL_MS);
    };

    /* ---------- open the stream ---------- */
    closeStreamRef.current = api.openAnalysisStream(sessionId, {
      onEvent: handleEvent,
      onDisconnect: () => {
        if (finishedRef.current) return;
        closeStreamRef.current = null;
        startPolling();
      },
    });

    /* ---------- FR-10.5: hard deadline ---------- */
    deadlineRef.current = setTimeout(() => {
      if (finishedRef.current) return;
      dispatch({
        type: "pipeline_error",
        error: {
          error_code: "pipeline_timeout",
          message:
            "The analysis took longer than expected and was stopped. This is usually temporary — try the same image again.",
          session_id: sessionId,
          status: null,
        },
      });
      stopEverything();
    }, MAX_PIPELINE_MS);

    // Runs when the user navigates away. Without it, EventSource keeps
    // reconnecting to a session nobody is watching.
    return stopEverything;
  }, [sessionId]);

  return state;
}
