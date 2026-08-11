/**
 * Sanitization result (UC-5, FR-5.x) as the UI consumes it.
 *
 * The wire shape is `SanitizeResponse` in `types/api.ts`; this is the
 * normalized version the before/after screen renders, with a summary that
 * is always populated (the mapper synthesises a minimal one if the backend
 * omits it).
 */
import type { BoundingBox } from "./report";
import type { SanitizationSummaryItem } from "./api";

export interface SanitizeResult {
  session_id: string;
  sanitized_image_id: string;

  /** FR-5.6: every modification applied, one line each. */
  summary: SanitizationSummaryItem[];

  /**
   * Image URLs for the before/after comparison. Both optional — the SRS
   * stores a `sanitized_image_ref` and exposes a download endpoint, but no
   * inline image URL. When absent the viewer shows the same placeholder
   * treatment as the rest of the app.
   */
  original_image_url?: string | null;
  sanitized_image_url?: string | null;

  /**
   * Regions that were blurred or redacted (FR-5.3 – FR-5.5), reused from
   * the privacy engine's detections so the before/after panels can show
   * exactly what changed.
   */
  blurred_regions: BoundingBox[];
  redacted_regions: BoundingBox[];
}
