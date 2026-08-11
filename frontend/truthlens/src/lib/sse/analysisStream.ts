/**
 * Server-Sent Events: the live progress stream (UC-3, FR-10.x).
 *
 * WHAT SSE IS
 * One long-lived HTTP GET that the server keeps open and writes to as work
 * completes. The browser's built-in `EventSource` handles it. Unlike
 * WebSockets it is one-directional (server → browser) and plain HTTP, which
 * is exactly what a progress feed needs and why the SRS chose it.
 *
 * WHY THIS IS NOT IN THE PAGE COMPONENT
 * The connection has a lifecycle (open, nine named listeners, error, close)
 * that must be torn down when the user navigates away, or the browser keeps
 * reconnecting to a finished analysis forever. Isolating it here means the
 * React hook deals with state and this file deals with the network — and
 * this file can be swapped for the mock stream without touching either.
 */
import { apiUrl } from "@/lib/api/client";
import { CLIENT_ERROR_CODES } from "@/types/api";
import type {
  AnalysisEvent,
  AnalysisEventName,
  AnalysisEventPayload,
} from "@/types/analysis";
import type {
  AnalysisStreamHandlers,
  CloseStream,
} from "@/lib/api/contract";

/** Every named event the backend emits (SRS §9.2). */
export const ANALYSIS_EVENT_NAMES: readonly AnalysisEventName[] = [
  "upload_received",
  "metadata_done",
  "ocr_done",
  "privacy_done",
  "forensics_done",
  "ai_assessment_done",
  "regional_done",
  "scoring_done",
  "report_ready",
  "error",
] as const;

/**
 * SSE payloads are strings. FR-10.2 says each carries a stage, timestamp and
 * message as JSON — but a backend bug or a plain-text heartbeat must not
 * crash the analysis screen, so an unparsable payload degrades to an empty
 * object and the event itself still counts.
 */
function parsePayload(data: string): AnalysisEventPayload {
  if (!data) return {};
  try {
    const parsed: unknown = JSON.parse(data);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as AnalysisEventPayload)
      : { message: String(parsed) };
  } catch {
    return { message: data };
  }
}

/**
 * Opens the stream and wires up one listener per named event.
 *
 * @returns a function that closes the connection. Always call it on unmount.
 */
export function openAnalysisStream(
  sessionId: string,
  handlers: AnalysisStreamHandlers,
): CloseStream {
  const source = new EventSource(apiUrl(`/analyze/stream/${sessionId}`));
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    source.close();
  };

  for (const name of ANALYSIS_EVENT_NAMES) {
    source.addEventListener(name, (event) => {
      const payload = parsePayload((event as MessageEvent<string>).data);
      handlers.onEvent({ name, payload } satisfies AnalysisEvent);

      // FR-10.5: the stream closes once the report is ready. Closing from
      // our side too stops EventSource's automatic reconnect from opening a
      // fresh connection to an analysis that has already finished.
      if (name === "report_ready") close();
    });
  }

  /**
   * `EventSource` fires `onerror` both for a transient blip (it will retry
   * on its own) and for a dead connection (it will not). We cannot reliably
   * tell them apart, so we take the conservative route: close, and tell the
   * consumer to fall back to polling. Polling always terminates; a silently
   * retrying stream can leave the user watching a frozen stepper.
   */
  source.onerror = () => {
    if (closed) return;
    close();
    handlers.onDisconnect({
      error_code: CLIENT_ERROR_CODES.STREAM_DISCONNECTED,
      message: "Live progress stream disconnected.",
      session_id: sessionId,
      status: null,
    });
  };

  return close;
}
