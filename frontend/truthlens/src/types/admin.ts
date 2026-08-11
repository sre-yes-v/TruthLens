/**
 * Admin monitoring types (UC-7).
 *
 * IMPORTANT: the SRS defines no admin API endpoint. These types describe
 * the screen the prototype shows, so the UI can be built and demonstrated
 * now; they are served by the mock adapter only. The real service throws
 * `not_implemented` rather than pretending to work — see
 * `lib/api/services.ts`.
 */

export interface SystemHealth {
  /** Drives the green dot in the prototype header. */
  all_engines_operational: boolean;
  updated_at: string;
}

export interface AdminStats {
  active_sessions: number;
  /** NFR-1.3: the reference deployment targets 5 concurrent sessions. */
  session_capacity: number;
  /** NFR-1.1: average end-to-end pipeline duration, in seconds. */
  avg_pipeline_seconds: number;
  /** NFR-2.3: percentage of runs reaching report_ready in the last 24h. */
  completion_rate_24h: number;
  /** NFR-4.1: images still inside the retention window. */
  images_in_retention: number;
}

/** A row of the prototype's "Recent engine failures" list. */
export interface EngineFailure {
  /** Engine label, e.g. "OCR", "Privacy (YOLO)". */
  engine: string;
  message: string;
  session_id: string;
  timestamp: string;
  recovered: boolean;
}

/** A row of the `audit_logs` collection (SRS §8.1). */
export interface AuditLogEntry {
  session_id: string;
  stage: string;
  /** e.g. "report_ready", "engine_failed", "sanitize_done". */
  event_type: string;
  timestamp: string;
}

export interface AdminOverview {
  health: SystemHealth;
  stats: AdminStats;
  recent_failures: EngineFailure[];
  audit_log: AuditLogEntry[];
}
