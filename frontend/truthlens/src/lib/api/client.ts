/**
 * The HTTP client. Every request to the FastAPI backend goes through here.
 *
 * WHY A CLIENT INSTEAD OF `fetch` IN COMPONENTS
 * Five things have to happen identically on every call: prefix the base URL,
 * add the `/api/v1` version, parse the response, convert failures into one
 * error type, and honour cancellation. Written inline, that is five chances
 * per call site to get it wrong. Written once, a component just calls
 * `getReport(id)` and catches `ApiError`.
 */
import { env } from "@/config/env";
import { CLIENT_ERROR_CODES } from "@/types/api";
import { ApiError } from "@/types/errors";
import { isApiErrorPayload } from "@/lib/utils/errors";

/**
 * The API version prefix, from SRS §9: "All endpoints are versioned under
 * /api/v1". It lives next to the endpoints rather than in the env var, so
 * `NEXT_PUBLIC_API_BASE_URL` stays a plain host and the version is a code
 * change when the backend ships v2.
 */
export const API_VERSION_PREFIX = "/api/v1";

/** Builds a full URL: "/upload" → "http://localhost:8000/api/v1/upload". */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${env.apiBaseUrl}${API_VERSION_PREFIX}${normalized}`;
}

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  /** Sent as JSON. Mutually exclusive with `formData`. */
  body?: unknown;
  /** Sent as multipart/form-data — used by the upload endpoint. */
  formData?: FormData;
  signal?: AbortSignal;
  /** Session id to attach to any error, for log correlation (SRS §9.4). */
  sessionId?: string | null;
}

/**
 * Reads an error response and produces an ApiError.
 *
 * The backend should return the SRS §9.4 body. It might not — a crashed
 * worker, a reverse proxy, or a 502 will return HTML or nothing. We handle
 * that here so no caller ever has to.
 */
async function toApiError(
  response: Response,
  sessionId: string | null,
): Promise<ApiError> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Not JSON. Fall through to the generic message below.
  }

  if (isApiErrorPayload(payload)) {
    return new ApiError({
      error_code: payload.error_code,
      message: payload.message,
      session_id: payload.session_id ?? sessionId,
      status: response.status,
    });
  }

  return new ApiError({
    error_code: `http_${response.status}`,
    message:
      response.status >= 500
        ? "The analysis service ran into a problem. Please try again."
        : `Request failed with status ${response.status}.`,
    session_id: sessionId,
    status: response.status,
  });
}

/** Wraps a thrown fetch rejection (offline, DNS, CORS) as an ApiError. */
function toNetworkError(error: unknown, sessionId: string | null): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof DOMException && error.name === "AbortError") {
    return new ApiError({
      error_code: CLIENT_ERROR_CODES.ABORTED,
      message: "The request was cancelled.",
      session_id: sessionId,
      status: null,
    });
  }

  return new ApiError({
    error_code: CLIENT_ERROR_CODES.NETWORK,
    message: "Couldn't reach the analysis service. Check your connection.",
    session_id: sessionId,
    status: null,
  });
}

/**
 * Performs a request and returns the parsed JSON body.
 *
 * @throws {ApiError} on any non-2xx response, network failure, or unparsable body.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, formData, signal, sessionId = null } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  let requestBody: BodyInit | undefined;

  if (formData) {
    // Deliberately NOT setting Content-Type: the browser must add the
    // multipart boundary itself. Setting it by hand breaks the upload.
    requestBody = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method,
      headers,
      body: requestBody,
      signal,
    });
  } catch (error) {
    throw toNetworkError(error, sessionId);
  }

  if (!response.ok) {
    throw await toApiError(response, sessionId);
  }

  // 204 No Content — DELETE /sessions/{id} returns this.
  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError({
      error_code: CLIENT_ERROR_CODES.MALFORMED_RESPONSE,
      message: "The service returned an unexpected response.",
      session_id: sessionId,
      status: response.status,
    });
  }
}

/**
 * Performs a request and returns the raw Response, for the endpoints that
 * stream a file rather than JSON (report download, sanitized image download).
 *
 * @throws {ApiError} on any non-2xx response or network failure.
 */
export async function apiRequestRaw(
  path: string,
  options: RequestOptions = {},
): Promise<Response> {
  const { method = "GET", signal, sessionId = null } = options;

  let response: Response;
  try {
    response = await fetch(apiUrl(path), { method, signal });
  } catch (error) {
    throw toNetworkError(error, sessionId);
  }

  if (!response.ok) {
    throw await toApiError(response, sessionId);
  }

  return response;
}
