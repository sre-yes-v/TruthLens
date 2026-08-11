/**
 * Environment configuration — read once, here, and nowhere else.
 *
 * Why a file for this: `process.env.NEXT_PUBLIC_*` scattered through
 * components is impossible to audit and impossible to change. Every
 * environment-dependent value in the app is resolved in this one module,
 * so "where does the backend URL come from?" has exactly one answer.
 *
 * Note on NEXT_PUBLIC_: Next.js inlines these at build time, so they must
 * be referenced as full literals (`process.env.NEXT_PUBLIC_X`) — you cannot
 * build the key dynamically.
 */

function readFlag(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

export const env = {
  /**
   * Base URL of the FastAPI backend, without a trailing slash.
   * The `/api/v1` prefix is added by the API client, not stored here,
   * so the version lives with the endpoint definitions.
   */
  apiBaseUrl: (
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
  ).replace(/\/+$/, ""),

  /**
   * When true, all API calls and the SSE stream are served by the mock
   * adapter in `src/mocks/` instead of the network. This is what lets the
   * frontend be built and demoed before the FastAPI backend exists.
   */
  useMockApi: readFlag(process.env.NEXT_PUBLIC_USE_MOCK_API, false),

  /**
   * Shows the prototype's "Prototype map" reviewer aid — a floating panel
   * that jumps to any UI state. Off by default so it never reaches users.
   */
  enablePrototypeTools: readFlag(
    process.env.NEXT_PUBLIC_ENABLE_PROTOTYPE_TOOLS,
    false,
  ),
} as const;
