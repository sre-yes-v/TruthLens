/**
 * The real API — one function per SRS endpoint, and nothing else.
 *
 * There are eight endpoints in SRS §9.1–9.2. They are grouped by area with
 * comments rather than split across five near-empty files: opening one file
 * to see the entire backend surface is more useful than navigating a folder.
 *
 * This module never imports mock data. The real/mock choice happens in
 * `index.ts`.
 */
import { apiRequest, apiRequestRaw } from "./client";
import { toReport } from "./mappers";
import { openAnalysisStream } from "@/lib/sse/analysisStream";
import { filenameFromResponse } from "@/lib/utils/download";
import { CLIENT_ERROR_CODES } from "@/types/api";
import { ApiError } from "@/types/errors";
import type {
  AnalysisStatusResponse,
  DownloadedFile,
  ReportDownloadFormat,
  SanitizeResponse,
  UploadResponse,
} from "@/types/api";
import type { AdminOverview } from "@/types/admin";
import type { Report } from "@/types/report";
import type { TruthLensApi } from "./contract";

export const realApi: TruthLensApi = {
  /* ================================================================
     Upload — UC-1
     ================================================================ */

  /**
   * `POST /api/v1/upload` (multipart) → 201 with a `session_id`.
   *
   * The field name `file` is FastAPI's convention for `UploadFile = File(...)`.
   * If the backend names its parameter differently, this is the line to change.
   */
  async uploadImage(file: File, signal?: AbortSignal): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<UploadResponse>("/upload", {
      method: "POST",
      formData,
      signal,
    });
  },

  /* ================================================================
     Analysis — UC-2, UC-3
     ================================================================ */

  /** `GET /api/v1/analyze/stream/{session_id}` — see lib/sse/analysisStream.ts. */
  openAnalysisStream,

  /** `GET /api/v1/analyze/status/{session_id}` — the FR-10.4 polling fallback. */
  async getAnalysisStatus(
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<AnalysisStatusResponse> {
    return apiRequest<AnalysisStatusResponse>(
      `/analyze/status/${encodeURIComponent(sessionId)}`,
      { signal, sessionId },
    );
  },

  /* ================================================================
     Report — UC-4, UC-6
     ================================================================ */

  /**
   * `GET /api/v1/reports/{report_id}`.
   * The raw body goes through `toReport`, so callers always get a typed
   * Report and never a half-checked object.
   */
  async getReport(reportId: string, signal?: AbortSignal): Promise<Report> {
    const raw = await apiRequest<unknown>(
      `/reports/${encodeURIComponent(reportId)}`,
      { signal },
    );
    return toReport(raw);
  },

  /**
   * `GET /api/v1/reports/{report_id}/download`.
   *
   * FR-11.3 requires both a JSON and a rendered (PDF/HTML) form, but §9.1
   * documents a single path with no format parameter. We send `?format=`;
   * flagged in docs/implementation-notes.md as needing backend confirmation.
   */
  async downloadReport(
    reportId: string,
    format: ReportDownloadFormat,
  ): Promise<DownloadedFile> {
    const response = await apiRequestRaw(
      `/reports/${encodeURIComponent(reportId)}/download?format=${format}`,
    );
    return {
      blob: await response.blob(),
      filename: filenameFromResponse(
        response,
        `truthlens-report-${reportId}.${format}`,
      ),
    };
  },

  /* ================================================================
     Sanitize — UC-5, UC-6
     ================================================================ */

  /**
   * `POST /api/v1/sanitize/{session_id}`.
   *
   * Returns 409 when the forensic report isn't complete (UC-5 alternate
   * flow, FR-5.7). That is not a bug — it is the orchestration layer
   * refusing to destroy evidence before it has been captured. The UI shows
   * an explanation; see `lib/utils/errors.ts#isSanitizeConflict`.
   */
  async sanitizeImage(
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<SanitizeResponse> {
    return apiRequest<SanitizeResponse>(
      `/sanitize/${encodeURIComponent(sessionId)}`,
      { method: "POST", signal, sessionId },
    );
  },

  /** `GET /api/v1/sanitize/{session_id}/download`. */
  async downloadSanitizedImage(sessionId: string): Promise<DownloadedFile> {
    const response = await apiRequestRaw(
      `/sanitize/${encodeURIComponent(sessionId)}/download`,
      { sessionId },
    );
    return {
      blob: await response.blob(),
      filename: filenameFromResponse(
        response,
        `truthlens-sanitized-${sessionId}.jpg`,
      ),
    };
  },

  /* ================================================================
     Session lifecycle
     ================================================================ */

  /**
   * `DELETE /api/v1/sessions/{session_id}` → 204.
   * Lets the user delete everything before retention expiry (§11 Privacy).
   */
  async deleteSession(sessionId: string, signal?: AbortSignal): Promise<void> {
    await apiRequest<void>(`/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      signal,
      sessionId,
    });
  },

  /* ================================================================
     Admin — UC-7
     ================================================================ */

  /**
   * The SRS defines NO admin endpoint. Rather than invent one, this fails
   * loudly and honestly. The admin screen is fully built and served by the
   * mock adapter; when the backend adds a real endpoint, replace this body
   * with an `apiRequest` call and nothing else changes.
   */
  async getAdminOverview(): Promise<AdminOverview> {
    throw new ApiError({
      error_code: CLIENT_ERROR_CODES.NOT_IMPLEMENTED,
      message:
        "The admin monitoring API is not defined in the SRS. Run with NEXT_PUBLIC_USE_MOCK_API=true to view this screen with sample data.",
      session_id: null,
      status: null,
    });
  },
};
