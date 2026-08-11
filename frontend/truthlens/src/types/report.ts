/**
 * The forensic report — the most important type in the frontend.
 *
 * Origin of every field:
 *   • The top-level scores come from SRS §9.3 (the documented `report_ready`
 *     payload) verbatim.
 *   • §9.3 is explicitly "abbreviated", but FR-11.1 requires the report to
 *     contain Metadata, OCR, Privacy, Forensic, AI, Regional and
 *     Recommendations sections. Those sub-documents are modelled here from
 *     their own functional requirements (FR-2.x … FR-8.x) and from the
 *     sections the prototype actually renders.
 *   • Fields the SRS does not pin down are marked optional and listed in
 *     docs/implementation-notes.md.
 *
 * Because this file is the single description of the backend's report
 * shape, a change in the FastAPI response is a change *here* — plus the
 * mapper in `lib/api/mappers.ts` — and TypeScript then points at every UI
 * site that needs updating. That is the whole reason for not using `any`.
 */

/** FR-9.3: Authenticity Score bands. Exact strings from SRS §9.3. */
export type RiskLevel =
  | "Likely Authentic" // 76–100
  | "Low Concern" // 51–75
  | "Moderate Concern" // 26–50
  | "High Concern"; // 0–25

/** FR-7.5 / FR-9.4: how much corroborating evidence was available. */
export type ConfidenceLevel = "Low" | "Medium" | "High";

/** FR-4.7: Privacy Risk Score bands. */
export type PrivacyBand = "Low" | "Moderate" | "High" | "Critical";

/**
 * Per-engine health for a single run.
 *
 * NFR-2.1 / UC-2 alternate flow: an engine may fail without failing the
 * pipeline. The report must say so rather than showing an empty section
 * that looks like "nothing found" — those are very different findings.
 */
export type EngineStatus = "ok" | "degraded" | "unavailable";

/** A detection rectangle, as fractions of image width/height (0–1). */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  confidence?: number;
}

/** Fields shared by every engine section. */
interface EngineSection {
  status: EngineStatus;
  /** One-line summary shown in the collapsed accordion header. */
  summary: string;
  /** Why the engine degraded — required reading when status !== "ok". */
  unavailable_reason?: string;
}

/* ============================================================
   1. Metadata (FR-2.x)
   ============================================================ */

/** Severity of a metadata risk indicator (FR-2.7). */
export type MetadataIndicatorLevel = "critical" | "warning" | "info";

export interface MetadataIndicator {
  level: MetadataIndicatorLevel;
  text: string;
}

export interface MetadataFindings extends EngineSection {
  /**
   * Extracted EXIF/IPTC/XMP fields as ordered label/value pairs
   * (FR-2.1, FR-2.2, FR-2.3, FR-2.6). A list rather than a fixed object
   * because which fields exist varies per image.
   */
  fields: Array<{ label: string; value: string }>;
  /** FR-2.7: "GPS present", "editing software detected", "metadata stripped". */
  indicators: MetadataIndicator[];
  /** FR-2.8: absence of metadata is itself a finding, not an empty section. */
  metadata_present: boolean;
  gps_present?: boolean;
  editing_software_detected?: boolean;
}

/* ============================================================
   2. OCR & text (FR-3.x)
   ============================================================ */

/** FR-3.9: category tagged onto every OCR-derived sensitive finding. */
export type OcrFindingCategory =
  | "name"
  | "address"
  | "email"
  | "phone"
  | "location"
  | "vehicle"
  | "artifact"; // FR-7.4: garbled, generator-style text

export interface OcrFinding {
  category: OcrFindingCategory;
  /** Already masked by the backend where appropriate, e.g. "+91 98••• ••43". */
  value: string;
  /** FR-3.10: 0–100. Below the threshold the UI adds a "low confidence" note. */
  confidence?: number;
  low_confidence?: boolean;
  /** FR-3.2: where on the image the text was found. */
  bounding_box?: BoundingBox;
}

export interface OcrFindings extends EngineSection {
  findings: OcrFinding[];
  /** FR-3.2: raw recognised text, when the backend returns it. */
  extracted_text?: string;
}

/* ============================================================
   3. Privacy (FR-4.x)
   ============================================================ */

export interface DetectedObject {
  /** FR-4.8: class label, e.g. "Face", "Number plate", "QR code". */
  label: string;
  count: number;
  /** Detection confidence per instance, 0–1 (FR-4.8). */
  confidences: number[];
  bounding_boxes: BoundingBox[];
}

export interface PrivacyFindings extends EngineSection {
  /** FR-4.6: 0–100. Duplicated at report top level for the score card. */
  privacy_risk_score: number;
  /** FR-4.7. */
  risk_band: PrivacyBand;
  detected_objects: DetectedObject[];
}

/* ============================================================
   4. Forensics / manipulation (FR-6.x)
   ============================================================ */

export interface ForensicFindings extends EngineSection {
  /** FR-6.5: 0–100. */
  forensic_suspicion_score: number;
  /** FR-6.2: description of flagged regions, or "None significant". */
  candidate_regions: string;
  /** FR-6.3: e.g. "1 (consistent)", "N/A (PNG)". */
  compression_generations: string;
  /** FR-6.4: cross-engine inconsistency, or "None". */
  metadata_cross_check: string;
  /**
   * FR-6.6: the ELA map as a downloadable visual artifact.
   * Optional — the SRS stores an `ela_map_ref`, not a URL. See
   * docs/implementation-notes.md.
   */
  ela_map_url?: string | null;
}

/* ============================================================
   5. AI-generated content (FR-7.x)
   ============================================================ */

/** Whether a signal pushed the AI probability up or down (FR-7.2 – FR-7.4). */
export type SignalDirection = "increases" | "decreases";

export interface AiSignal {
  direction: SignalDirection;
  /** e.g. "No camera metadata present". */
  label: string;
  /** Optional numeric contribution, e.g. "82%". */
  value?: string;
}

export interface AiAssessment extends EngineSection {
  /** FR-7.5: 0–100. Never rendered as a yes/no label (FR-7.6). */
  ai_probability_score: number;
  confidence_level: ConfidenceLevel;
  /** FR-9.5-style explainability: how the score was reached. */
  signals: AiSignal[];
}

/* ============================================================
   6. Kerala regional evidence (FR-8.x)
   ============================================================ */

/** FR-8.6: what kind of clue this evidence item is. */
export type RegionalEvidenceType =
  | "vehicle_plate" // FR-8.1
  | "std_code" // FR-8.4
  | "place_name" // FR-8.3
  | "malayalam_text" // FR-8.2
  | "scene_cue" // FR-8.5 — corroborating only
  | "other";

export interface RegionalEvidenceItem {
  type: RegionalEvidenceType;
  /** SRS §9.3 names this field `value`. */
  value: string;
  /** 0–100. */
  confidence: number;
}

export interface ProbableRegion {
  region: string;
  /** 0–100. */
  confidence: number;
}

export interface RegionalEvidence extends EngineSection {
  /** SRS §9.3. */
  evidence_chain: RegionalEvidenceItem[];
  /** FR-8.9: a ranked list, not a single guess. */
  probable_regions: ProbableRegion[];
  /**
   * FR-8.7: false when only weak/corroborating evidence was found. The UI
   * must then say "insufficient evidence" — it must NOT show the top
   * candidate as if it were a conclusion.
   */
  sufficient_evidence: boolean;
  regional_confidence_score?: number;
}

/* ============================================================
   7. Recommendations (FR-11.2)
   ============================================================ */

/** Drives the icon and colour of a recommendation row in the prototype. */
export type RecommendationSeverity = "action" | "info" | "ok";

export interface Recommendation {
  text: string;
  /**
   * SRS §9.3 types `recommendations` as plain strings. Severity is
   * therefore optional, and `lib/api/mappers.ts` defaults a bare string to
   * "info" rather than guessing something more alarming.
   */
  severity: RecommendationSeverity;
}

/* ============================================================
   The report itself
   ============================================================ */

export interface Report {
  /* --- SRS §9.3, verbatim --- */
  session_id: string;
  report_id: string;
  /** FR-9.1: 0–100 composite. */
  authenticity_score: number;
  risk_level: RiskLevel;
  privacy_risk_score: number;
  forensic_suspicion_score: number;
  ai_probability_score: number;

  /* --- FR-9.4 --- */
  confidence_level: ConfidenceLevel;

  /* --- FR-11.1 sections --- */
  metadata: MetadataFindings;
  ocr: OcrFindings;
  privacy: PrivacyFindings;
  forensics: ForensicFindings;
  ai_assessment: AiAssessment;
  regional_evidence: RegionalEvidence;
  recommendations: Recommendation[];

  /* --- lifecycle --- */
  created_at: string;
  /** NFR-4.1 retention. Optional: not in the SRS response schema. */
  expires_at?: string | null;
  /**
   * UC-4 alternate flow: a report assembled with a missing required field
   * is flagged "incomplete" rather than failing silently.
   */
  incomplete?: boolean;

  /**
   * URL of the analysed image, if the backend serves one. Not defined by
   * the SRS — every consumer treats it as possibly absent and falls back
   * to a placeholder. See docs/implementation-notes.md.
   */
  image_url?: string | null;
}
