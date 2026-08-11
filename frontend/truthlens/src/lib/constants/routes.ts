/**
 * Every route in the app, built by a function instead of written as a
 * template literal at the call site.
 *
 * Why: `router.push(\`/report/${id}\`)` in twelve files means a route
 * rename is a find-and-replace across the codebase, and a typo is a
 * runtime 404 rather than a compile error. Here it is one edit.
 */
export const routes = {
  home: () => "/",
  analyze: (sessionId: string) => `/analyze/${encodeURIComponent(sessionId)}`,
  report: (reportId: string) => `/report/${encodeURIComponent(reportId)}`,

  /**
   * Sanitization is keyed by session (that is what POST /sanitize/{session_id}
   * takes), but the "Back to report" link needs a report id — so it rides
   * along as a query param rather than becoming a second dynamic segment.
   */
  sanitize: (sessionId: string, reportId?: string) => {
    const base = `/sanitize/${encodeURIComponent(sessionId)}`;
    return reportId ? `${base}?report=${encodeURIComponent(reportId)}` : base;
  },

  expired: () => "/expired",
  admin: () => "/admin",
} as const;
