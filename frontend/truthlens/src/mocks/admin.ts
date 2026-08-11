/**
 * Sample admin data, ported from the prototype's admin screen.
 *
 * The SRS defines no admin API, so these numbers exist purely to let the
 * screen be built and reviewed. `lib/api/services.ts#getAdminOverview`
 * deliberately throws rather than returning anything resembling this — the
 * fake never leaks into the real path.
 */
import type { AdminOverview } from "@/types/admin";

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

export function buildMockAdminOverview(): AdminOverview {
  return {
    health: {
      all_engines_operational: true,
      updated_at: new Date().toISOString(),
    },
    stats: {
      active_sessions: 3,
      session_capacity: 5,
      avg_pipeline_seconds: 21,
      completion_rate_24h: 99.2,
      images_in_retention: 47,
    },
    recent_failures: [
      {
        engine: "OCR",
        message: "Timeout on 8000×6000 image",
        session_id: "f9a2",
        timestamp: minutesAgo(18),
        recovered: false,
      },
      {
        engine: "Privacy (YOLO)",
        message: "Model load error, auto-retried and recovered",
        session_id: "2b71",
        timestamp: minutesAgo(42),
        recovered: true,
      },
    ],
    audit_log: [
      { session_id: "a1b2", stage: "report", event_type: "report_ready", timestamp: minutesAgo(2) },
      { session_id: "a1b2", stage: "scoring", event_type: "scoring_done", timestamp: minutesAgo(2) },
      { session_id: "c3d4", stage: "privacy", event_type: "engine_failed", timestamp: minutesAgo(5) },
      { session_id: "c3d4", stage: "upload", event_type: "upload_received", timestamp: minutesAgo(6) },
      { session_id: "7f10", stage: "sanitize", event_type: "sanitize_done", timestamp: minutesAgo(9) },
    ],
  };
}
