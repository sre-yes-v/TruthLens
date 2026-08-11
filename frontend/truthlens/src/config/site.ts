/**
 * Static product copy and limits.
 *
 * These are values a reader of the SRS would recognise (retention window,
 * max upload size, the mandatory disclaimer). Keeping them here means the
 * disclaimer text is written once and reused in the report, the landing
 * page and the download — which is exactly what FR-9.6 / FR-11.5 require.
 */
export const site = {
  name: "TruthLens",
  tagline: "Check any image before you trust it",
  description:
    "See what an image reveals about you, and whether it has been edited or AI-generated. One upload, one clear report.",

  /**
   * The probabilistic / non-legal disclaimer. Mandated by FR-9.6 (scoring)
   * and FR-11.5 (report header). Never soften this wording.
   */
  disclaimer:
    "This is a probabilistic assessment based on visible evidence — not a legal verdict. Treat scores as guidance, not proof.",

  disclaimerShort:
    "TruthLens gives a probabilistic, evidence-based read — not a legal or certified verdict of authenticity.",

  /** NFR-4.1: original images are deleted after this window. */
  retentionHours: 24,
} as const;
