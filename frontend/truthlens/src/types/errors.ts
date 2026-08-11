/**
 * One error type for the whole application.
 *
 * Anything that can fail — a 422 from the backend, a dropped SSE stream,
 * an offline browser — is converted into this single shape by the API
 * client. Components therefore never write `catch (e: any)` and never
 * branch on where a failure came from.
 */
import type { ApiErrorPayload } from "./api";

export interface NormalizedApiError extends ApiErrorPayload {
  /**
   * HTTP status, when there was one. `null` for failures that never got a
   * response (network down, aborted request, stream disconnect).
   */
  status: number | null;
}

/**
 * Thrown by the API client. Carries the normalized payload so a `catch`
 * block can read `err.error_code` without any type gymnastics.
 */
export class ApiError extends Error {
  readonly error_code: string;
  readonly session_id: string | null;
  readonly status: number | null;

  constructor(details: NormalizedApiError) {
    super(details.message);
    this.name = "ApiError";
    this.error_code = details.error_code;
    this.session_id = details.session_id;
    this.status = details.status;
  }

  /** Plain object form, for storing in React state. */
  toNormalized(): NormalizedApiError {
    return {
      error_code: this.error_code,
      message: this.message,
      session_id: this.session_id,
      status: this.status,
    };
  }
}
