/**
 * The contract every part of the app codes against.
 *
 * There are two implementations of this interface:
 *   • `services.ts` — real HTTP calls to the FastAPI backend.
 *   • `src/mocks/mockApi.ts` — in-memory fake data, for developing the
 *     frontend before the backend exists.
 *
 * Because both satisfy the same interface, swapping them is one line in
 * `index.ts` and no component knows or cares which one is live. TypeScript
 * also guarantees the mock cannot drift out of sync with the real API: if a
 * function signature changes here, both implementations fail to compile.
 */
import type {
  AnalysisStatusResponse,
  DownloadedFile,
  ReportDownloadFormat,
  SanitizeResponse,
  UploadResponse,
} from "@/types/api";
import type { AnalysisEvent } from "@/types/analysis";
import type { NormalizedApiError } from "@/types/errors";
import type { Report } from "@/types/report";
import type { AdminOverview } from "@/types/admin";

/** Callbacks an SSE consumer supplies. */
export interface AnalysisStreamHandlers {
  /** Fired for every named event from the stream. */
  onEvent: (event: AnalysisEvent) => void;
  /**
   * Fired when the connection drops. The consumer is expected to start
   * polling — see FR-10.4 and `hooks/useAnalysisStream.ts`.
   */
  onDisconnect: (error: NormalizedApiError) => void;
}

/** Closes a stream. Returned by `openAnalysisStream` so callers can clean up. */
export type CloseStream = () => void;

export interface TruthLensApi {
  /* --- Upload (UC-1) --- */
  /** `POST /api/v1/upload` */
  uploadImage(file: File, signal?: AbortSignal): Promise<UploadResponse>;

  /* --- Analysis (UC-2, UC-3) --- */
  /** `GET /api/v1/analyze/stream/{session_id}` */
  openAnalysisStream(
    sessionId: string,
    handlers: AnalysisStreamHandlers,
  ): CloseStream;
  /** `GET /api/v1/analyze/status/{session_id}` — the SSE fallback. */
  getAnalysisStatus(
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<AnalysisStatusResponse>;

  /* --- Report (UC-4, UC-6) --- */
  /** `GET /api/v1/reports/{report_id}` */
  getReport(reportId: string, signal?: AbortSignal): Promise<Report>;
  /** `GET /api/v1/reports/{report_id}/download` */
  downloadReport(
    reportId: string,
    format: ReportDownloadFormat,
  ): Promise<DownloadedFile>;

  /* --- Sanitize (UC-5, UC-6) --- */
  /** `POST /api/v1/sanitize/{session_id}` — 409 if the report isn't ready. */
  sanitizeImage(
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<SanitizeResponse>;
  /** `GET /api/v1/sanitize/{session_id}/download` */
  downloadSanitizedImage(sessionId: string): Promise<DownloadedFile>;

  /* --- Session lifecycle --- */
  /** `DELETE /api/v1/sessions/{session_id}` */
  deleteSession(sessionId: string, signal?: AbortSignal): Promise<void>;

  /* --- Admin (UC-7) --- */
  /**
   * No SRS endpoint exists for this. The real implementation rejects with
   * `not_implemented`; only the mock returns data.
   */
  getAdminOverview(signal?: AbortSignal): Promise<AdminOverview>;
}
