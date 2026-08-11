/**
 * Transport-level types: the shapes that cross the wire between this
 * frontend and the FastAPI backend. Domain shapes (report, analysis,
 * sanitize) live in their own files.
 *
 * Field names use snake_case because that is what FastAPI/Pydantic emits
 * and what SRS §9.3 documents. Renaming them to camelCase here would mean
 * a mapping layer for every field with no benefit, and would make the SRS
 * harder to check against the code during viva.
 */

/**
 * SRS §9.4: every error response from the backend has this shape.
 *
 *   { "error_code": string, "message": string, "session_id": string|null }
 */
export interface ApiErrorPayload {
  error_code: string;
  message: string;
  session_id: string | null;
}

/**
 * Error codes the frontend generates itself when a failure never reached
 * the backend (or came back in a shape we can't parse). Keeping them
 * distinct from backend codes makes debugging unambiguous: a `network_error`
 * is always the browser's fault, never the API's.
 */
export const CLIENT_ERROR_CODES = {
  /** Fetch rejected: server unreachable, DNS failure, CORS, offline. */
  NETWORK: "network_error",
  /** Response arrived but wasn't the JSON we expected. */
  MALFORMED_RESPONSE: "malformed_response",
  /** The request was cancelled by the user or by unmounting. */
  ABORTED: "request_aborted",
  /** The SSE stream dropped. */
  STREAM_DISCONNECTED: "stream_disconnected",
  /** A feature exists in the UI but has no SRS endpoint yet. */
  NOT_IMPLEMENTED: "not_implemented",
} as const;

/** `POST /api/v1/upload` → 201 Created (UC-1 step 6, FR-1.4). */
export interface UploadResponse {
  session_id: string;
}

/**
 * `GET /api/v1/analyze/status/{session_id}` → 200 OK.
 * The SSE fallback (FR-10.4). SRS §9.1 documents "stage and progress
 * percentage"; the extra fields are optional so a minimal backend
 * response still type-checks.
 */
export interface AnalysisStatusResponse {
  session_id: string;
  /** Matches an SSE stage name, e.g. "ocr" or "scoring". */
  stage: string;
  /** 0–100. */
  progress: number;
  status?: "running" | "completed" | "failed";
  /** Present once the pipeline finishes (mirrors report_ready). */
  report_id?: string | null;
  message?: string;
}

/** `POST /api/v1/sanitize/{session_id}` → 200 OK, or 409 if the report isn't ready. */
export interface SanitizeResponse {
  session_id: string;
  sanitized_image_id: string;
  /**
   * FR-5.6: what the sanitizer actually changed. Optional because the SRS
   * response line only names `sanitized_image_id`; when the backend omits
   * it the UI shows a generic summary rather than inventing detail.
   */
  sanitization_summary?: SanitizationSummaryItem[];
  /** Not in the SRS response — see docs/implementation-notes.md §image URLs. */
  original_image_url?: string | null;
  sanitized_image_url?: string | null;
}

/** One line of FR-5.6's Sanitization Summary. */
export interface SanitizationSummaryItem {
  /** e.g. "metadata" | "face" | "plate" | "qr" | "document" */
  category: string;
  /** Display text, e.g. "EXIF & GPS metadata removed". */
  description: string;
  /** How many regions of this category were changed, when applicable. */
  count?: number;
}

/** Formats offered by the download dialog (FR-11.3). */
export type ReportDownloadFormat = "pdf" | "json";

/** A file handed back by a download endpoint, ready to be saved. */
export interface DownloadedFile {
  blob: Blob;
  filename: string;
}
