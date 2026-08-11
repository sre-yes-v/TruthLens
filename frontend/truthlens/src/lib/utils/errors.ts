/**
 * Turning any failure into one predictable shape, and one readable sentence.
 *
 * Two jobs:
 *   1. `normalizeError` — coerce whatever was thrown into NormalizedApiError.
 *   2. `describeError`  — turn an error code into text a non-technical user
 *      can act on. SRS §9.4 gives us `error_code` precisely so the UI can
 *      react to a stable machine value instead of matching on prose.
 */
import { CLIENT_ERROR_CODES, type ApiErrorPayload } from "@/types/api";
import { ApiError, type NormalizedApiError } from "@/types/errors";

/** True if `value` looks like the SRS §9.4 error body. */
export function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.error_code === "string" &&
    typeof candidate.message === "string"
  );
}

/**
 * Accepts anything a `catch` block can receive and always returns a
 * NormalizedApiError. Never throws.
 */
export function normalizeError(error: unknown): NormalizedApiError {
  if (error instanceof ApiError) return error.toNormalized();

  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      error_code: CLIENT_ERROR_CODES.ABORTED,
      message: "The request was cancelled.",
      session_id: null,
      status: null,
    };
  }

  if (isApiErrorPayload(error)) {
    return { ...error, session_id: error.session_id ?? null, status: null };
  }

  return {
    error_code: CLIENT_ERROR_CODES.NETWORK,
    message:
      error instanceof Error
        ? error.message
        : "Something went wrong. Please try again.",
    session_id: null,
    status: null,
  };
}

/**
 * User-facing text for an error, as a title plus a body.
 *
 * The wording for known cases is taken from the prototype so the copy stays
 * consistent with the design. Unknown codes fall back to the backend's own
 * `message`, which SRS §9.4 requires to be human-readable — so we are never
 * left showing a raw code.
 */
export function describeError(error: NormalizedApiError): {
  title: string;
  body: string;
} {
  switch (error.error_code) {
    case CLIENT_ERROR_CODES.NETWORK:
      return {
        title: "Couldn't reach TruthLens",
        body: "The analysis service isn't responding. Check your connection and try again.",
      };

    case CLIENT_ERROR_CODES.STREAM_DISCONNECTED:
      return {
        title: "Live updates interrupted",
        body: "The progress stream dropped, so we're checking for updates every few seconds instead. Your analysis is still running.",
      };

    case CLIENT_ERROR_CODES.NOT_IMPLEMENTED:
      return {
        title: "Not available yet",
        body: error.message,
      };

    case "unsupported_format":
      return {
        title: "Unsupported file type",
        body: "TruthLens reads JPEG, PNG and WEBP images. Export this file in one of those formats and try again.",
      };

    case "file_too_large":
      return {
        title: "Image is too large",
        body: error.message,
      };

    case "corrupted_image":
    case "invalid_image":
      return {
        title: "We couldn't read this file",
        body: "It may be corrupted or not a real image. Try exporting it again or pick another.",
      };

    case "report_not_found":
    case "retention_expired":
      return {
        title: "This report has expired",
        body: `Reports and their images are kept for a limited window, then permanently deleted for privacy. This one is no longer available.`,
      };

    case "report_not_ready":
      return {
        title: "Analysis isn't finished",
        body: "Sanitizing is unlocked once the forensic report is complete, so evidence is captured before anything is blurred or stripped.",
      };

    default:
      return {
        title: "Something went wrong",
        body: error.message,
      };
  }
}

/**
 * True when the failure means "this report is gone", so the report page can
 * send the user to /expired instead of showing a generic error.
 *
 * 404 and 410 both mean gone here: the SRS deletes artifacts after the
 * retention window (NFR-4.1), and a backend may report that either way.
 */
export function isExpiredError(error: NormalizedApiError): boolean {
  return (
    error.status === 404 ||
    error.status === 410 ||
    error.error_code === "retention_expired" ||
    error.error_code === "report_not_found"
  );
}

/**
 * True for the specific 409 in UC-5's alternate flow: sanitize was requested
 * before the report existed.
 */
export function isSanitizeConflict(error: NormalizedApiError): boolean {
  return error.status === 409 || error.error_code === "report_not_ready";
}
