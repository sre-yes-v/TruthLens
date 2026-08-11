/**
 * The boundary where "whatever the backend sent" becomes "a typed Report".
 *
 * WHY THIS FILE EXISTS
 * SRS §9.3 is explicitly an *abbreviated* schema, and the backend does not
 * exist yet. So there is real uncertainty about exact field names. The rule
 * we follow is: keep that uncertainty in ONE file. Everything downstream —
 * every hook, every component — receives a fully typed `Report` and never
 * writes a defensive check or an `any`.
 *
 * When the FastAPI response turns out to differ from what we assumed, this
 * is the only file that changes.
 */
import type {
  AiAssessment,
  AiSignal,
  BoundingBox,
  DetectedObject,
  EngineStatus,
  ForensicFindings,
  MetadataFindings,
  MetadataIndicator,
  OcrFinding,
  OcrFindingCategory,
  OcrFindings,
  PrivacyBand,
  PrivacyFindings,
  ProbableRegion,
  Recommendation,
  RecommendationSeverity,
  RegionalEvidence,
  RegionalEvidenceItem,
  RegionalEvidenceType,
  Report,
  RiskLevel,
} from "@/types/report";
import type { SanitizationSummaryItem, SanitizeResponse } from "@/types/api";
import type { SanitizeResult } from "@/types/sanitize";

/* ------------------------------------------------------------------
   Small readers. Each takes an unknown value and guarantees a type.
   ------------------------------------------------------------------ */

type Raw = Record<string, unknown>;

function obj(value: unknown): Raw {
  return typeof value === "object" && value !== null ? (value as Raw) : {};
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** Clamps to 0–100, because every score in the SRS is on that scale. */
function score(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Keeps a string only if it is one of the allowed values. */
function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

const RISK_LEVELS = [
  "Likely Authentic",
  "Low Concern",
  "Moderate Concern",
  "High Concern",
] as const;
const CONFIDENCE_LEVELS = ["Low", "Medium", "High"] as const;
const PRIVACY_BANDS = ["Low", "Moderate", "High", "Critical"] as const;
const ENGINE_STATUSES = ["ok", "degraded", "unavailable"] as const;
const OCR_CATEGORIES = [
  "name",
  "address",
  "email",
  "phone",
  "location",
  "vehicle",
  "artifact",
] as const;
const REGIONAL_TYPES = [
  "vehicle_plate",
  "std_code",
  "place_name",
  "malayalam_text",
  "scene_cue",
  "other",
] as const;

/* ------------------------------------------------------------------
   Derivations — used when the backend omits a value the UI needs.
   Each mirrors a rule that is already written down in the SRS, so we
   are re-applying a documented rule, not inventing one.
   ------------------------------------------------------------------ */

/** FR-9.3 band boundaries. */
export function riskLevelFromScore(value: number): RiskLevel {
  if (value >= 76) return "Likely Authentic";
  if (value >= 51) return "Low Concern";
  if (value >= 26) return "Moderate Concern";
  return "High Concern";
}

/** FR-4.7 band boundaries. */
export function privacyBandFromScore(value: number): PrivacyBand {
  if (value >= 86) return "Critical";
  if (value >= 61) return "High";
  if (value >= 31) return "Moderate";
  return "Low";
}

/* ------------------------------------------------------------------
   Section mappers
   ------------------------------------------------------------------ */

function toEngineStatus(raw: Raw): EngineStatus {
  return oneOf(raw.status, ENGINE_STATUSES, "ok");
}

function toBoundingBox(value: unknown): BoundingBox {
  const raw = obj(value);
  return {
    x: num(raw.x),
    y: num(raw.y),
    width: num(raw.width),
    height: num(raw.height),
    label: typeof raw.label === "string" ? raw.label : undefined,
    confidence: typeof raw.confidence === "number" ? raw.confidence : undefined,
  };
}

function toBoundingBoxes(value: unknown): BoundingBox[] {
  return list(value).map(toBoundingBox);
}

function toMetadata(value: unknown): MetadataFindings {
  const raw = obj(value);
  const fields = list(raw.fields).map((entry) => {
    const field = obj(entry);
    return { label: str(field.label), value: str(field.value, "—") };
  });

  const indicators: MetadataIndicator[] = list(raw.indicators).map((entry) => {
    const indicator = obj(entry);
    return {
      level: oneOf(
        indicator.level,
        ["critical", "warning", "info"] as const,
        "info",
      ),
      text: str(indicator.text),
    };
  });

  return {
    status: toEngineStatus(raw),
    summary: str(raw.summary, "Metadata analysed"),
    unavailable_reason: typeof raw.unavailable_reason === "string"
      ? raw.unavailable_reason
      : undefined,
    fields,
    indicators,
    // FR-2.8: absence of metadata is a finding. If the backend doesn't say,
    // infer it from whether any field came back.
    metadata_present: bool(raw.metadata_present, fields.length > 0),
    gps_present: typeof raw.gps_present === "boolean" ? raw.gps_present : undefined,
    editing_software_detected:
      typeof raw.editing_software_detected === "boolean"
        ? raw.editing_software_detected
        : undefined,
  };
}

function toOcr(value: unknown): OcrFindings {
  const raw = obj(value);
  const findings: OcrFinding[] = list(raw.findings).map((entry) => {
    const finding = obj(entry);
    const confidence =
      typeof finding.confidence === "number" ? finding.confidence : undefined;
    return {
      category: oneOf<OcrFindingCategory>(
        finding.category,
        OCR_CATEGORIES,
        "artifact",
      ),
      value: str(finding.value),
      confidence,
      // FR-3.10: below the 60% default threshold, annotate rather than hide.
      low_confidence: bool(
        finding.low_confidence,
        confidence !== undefined && confidence < 60,
      ),
      bounding_box: finding.bounding_box
        ? toBoundingBox(finding.bounding_box)
        : undefined,
    };
  });

  return {
    status: toEngineStatus(raw),
    summary: str(raw.summary, findings.length ? "Text found" : "No readable text found"),
    unavailable_reason: typeof raw.unavailable_reason === "string"
      ? raw.unavailable_reason
      : undefined,
    findings,
    extracted_text:
      typeof raw.extracted_text === "string" ? raw.extracted_text : undefined,
  };
}

function toPrivacy(value: unknown, topLevelScore: number): PrivacyFindings {
  const raw = obj(value);
  const privacyScore = score(raw.privacy_risk_score, topLevelScore);

  const detected: DetectedObject[] = list(raw.detected_objects).map((entry) => {
    const detection = obj(entry);
    const boxes = toBoundingBoxes(detection.bounding_boxes);
    const confidences = list(detection.confidences).map((c) => num(c));
    return {
      label: str(detection.label, "Object"),
      count: num(detection.count, Math.max(boxes.length, 1)),
      confidences: confidences.length
        ? confidences
        : boxes.map((b) => b.confidence ?? 0).filter((c) => c > 0),
      bounding_boxes: boxes,
    };
  });

  return {
    status: toEngineStatus(raw),
    summary: str(
      raw.summary,
      detected.length ? "Sensitive objects detected" : "No sensitive objects detected",
    ),
    unavailable_reason: typeof raw.unavailable_reason === "string"
      ? raw.unavailable_reason
      : undefined,
    privacy_risk_score: privacyScore,
    risk_band: oneOf(
      raw.risk_band,
      PRIVACY_BANDS,
      privacyBandFromScore(privacyScore),
    ),
    detected_objects: detected,
  };
}

function toForensics(value: unknown, topLevelScore: number): ForensicFindings {
  const raw = obj(value);
  return {
    status: toEngineStatus(raw),
    summary: str(raw.summary, "Manipulation check complete"),
    unavailable_reason: typeof raw.unavailable_reason === "string"
      ? raw.unavailable_reason
      : undefined,
    forensic_suspicion_score: score(raw.forensic_suspicion_score, topLevelScore),
    candidate_regions: str(raw.candidate_regions, "None significant"),
    compression_generations: str(raw.compression_generations, "—"),
    metadata_cross_check: str(raw.metadata_cross_check, "None"),
    ela_map_url: typeof raw.ela_map_url === "string" ? raw.ela_map_url : null,
  };
}

function toAiAssessment(value: unknown, topLevelScore: number): AiAssessment {
  const raw = obj(value);
  const probability = score(raw.ai_probability_score, topLevelScore);

  const signals: AiSignal[] = list(raw.signals).map((entry) => {
    const signal = obj(entry);
    return {
      direction: oneOf(
        signal.direction,
        ["increases", "decreases"] as const,
        "decreases",
      ),
      label: str(signal.label),
      value: typeof signal.value === "string" ? signal.value : undefined,
    };
  });

  return {
    status: toEngineStatus(raw),
    // FR-7.6: probabilistic phrasing only — never "AI-generated: yes".
    summary: str(raw.summary, `${probability}% likely AI-generated`),
    unavailable_reason: typeof raw.unavailable_reason === "string"
      ? raw.unavailable_reason
      : undefined,
    ai_probability_score: probability,
    confidence_level: oneOf(raw.confidence_level, CONFIDENCE_LEVELS, "Medium"),
    signals,
  };
}

function toRegionalEvidence(value: unknown): RegionalEvidence {
  const raw = obj(value);

  const chain: RegionalEvidenceItem[] = list(raw.evidence_chain).map((entry) => {
    const item = obj(entry);
    return {
      type: oneOf<RegionalEvidenceType>(item.type, REGIONAL_TYPES, "other"),
      value: str(item.value),
      confidence: score(item.confidence),
    };
  });

  const regions: ProbableRegion[] = list(raw.probable_regions).map((entry) => {
    const region = obj(entry);
    return { region: str(region.region), confidence: score(region.confidence) };
  });

  // FR-8.7: a region may only be named when at least one medium-or-higher
  // confidence item (plate, STD code, place name) is present. If the backend
  // doesn't state sufficiency, we apply that rule rather than assuming yes.
  const strongTypes: RegionalEvidenceType[] = [
    "vehicle_plate",
    "std_code",
    "place_name",
  ];
  const hasStrongEvidence = chain.some(
    (item) => strongTypes.includes(item.type) && item.confidence >= 50,
  );

  return {
    status: toEngineStatus(raw),
    summary: str(raw.summary, "Regional evidence analysed"),
    unavailable_reason: typeof raw.unavailable_reason === "string"
      ? raw.unavailable_reason
      : undefined,
    evidence_chain: chain,
    probable_regions: regions,
    sufficient_evidence: bool(
      raw.sufficient_evidence,
      hasStrongEvidence && regions.length > 0,
    ),
    regional_confidence_score:
      typeof raw.regional_confidence_score === "number"
        ? score(raw.regional_confidence_score)
        : undefined,
  };
}

/**
 * SRS §9.3 types recommendations as plain strings, while the prototype
 * colours each one by severity. We accept both: an object keeps its
 * severity, a bare string defaults to "info" — the neutral tone, so a
 * minimal backend never makes the UI look more alarming than the evidence.
 */
function toRecommendations(value: unknown): Recommendation[] {
  return list(value).map((entry): Recommendation => {
    if (typeof entry === "string") return { text: entry, severity: "info" };
    const raw = obj(entry);
    return {
      text: str(raw.text),
      severity: oneOf<RecommendationSeverity>(
        raw.severity,
        ["action", "info", "ok"] as const,
        "info",
      ),
    };
  });
}

/* ------------------------------------------------------------------
   Top level
   ------------------------------------------------------------------ */

/** Converts a raw `GET /reports/{id}` body into a typed Report. */
export function toReport(value: unknown): Report {
  const raw = obj(value);

  const authenticity = score(raw.authenticity_score);
  const privacyScore = score(raw.privacy_risk_score);
  const forensicScore = score(raw.forensic_suspicion_score);
  const aiScore = score(raw.ai_probability_score);

  return {
    session_id: str(raw.session_id),
    report_id: str(raw.report_id),
    authenticity_score: authenticity,
    risk_level: oneOf(raw.risk_level, RISK_LEVELS, riskLevelFromScore(authenticity)),
    privacy_risk_score: privacyScore,
    forensic_suspicion_score: forensicScore,
    ai_probability_score: aiScore,
    confidence_level: oneOf(raw.confidence_level, CONFIDENCE_LEVELS, "Medium"),

    metadata: toMetadata(raw.metadata),
    ocr: toOcr(raw.ocr),
    privacy: toPrivacy(raw.privacy, privacyScore),
    forensics: toForensics(raw.forensics, forensicScore),
    ai_assessment: toAiAssessment(raw.ai_assessment, aiScore),
    regional_evidence: toRegionalEvidence(raw.regional_evidence),
    recommendations: toRecommendations(raw.recommendations),

    created_at: str(raw.created_at, new Date().toISOString()),
    expires_at: typeof raw.expires_at === "string" ? raw.expires_at : null,
    incomplete: bool(raw.incomplete, false),
    image_url: typeof raw.image_url === "string" ? raw.image_url : null,
  };
}

/**
 * Converts a sanitize response into the shape the before/after screen needs.
 *
 * `report` is passed in so the blurred regions can be taken from the privacy
 * engine's own detections (FR-5.3–5.5 reuse the boxes computed in UC-2) when
 * the sanitize response doesn't repeat them.
 */
export function toSanitizeResult(
  response: SanitizeResponse,
  detectedObjects: DetectedObject[] = [],
): SanitizeResult {
  const summary: SanitizationSummaryItem[] =
    response.sanitization_summary ??
    buildFallbackSummary(detectedObjects);

  // FR-5.5 redacts QR codes outright; FR-5.3/5.4 blur faces and plates.
  const redacted: BoundingBox[] = [];
  const blurred: BoundingBox[] = [];
  for (const detection of detectedObjects) {
    const isQr = /qr/i.test(detection.label);
    (isQr ? redacted : blurred).push(...detection.bounding_boxes);
  }

  return {
    session_id: response.session_id,
    sanitized_image_id: response.sanitized_image_id,
    summary,
    original_image_url: response.original_image_url ?? null,
    sanitized_image_url: response.sanitized_image_url ?? null,
    blurred_regions: blurred,
    redacted_regions: redacted,
  };
}

/**
 * A minimal summary for when the backend returns only `sanitized_image_id`.
 * Metadata stripping is always true (FR-5.1 makes it unconditional); the
 * rest is derived from what the privacy engine actually detected, so we
 * never claim to have blurred something that was never found.
 */
function buildFallbackSummary(
  detectedObjects: DetectedObject[],
): SanitizationSummaryItem[] {
  const items: SanitizationSummaryItem[] = [
    { category: "metadata", description: "EXIF & GPS metadata removed" },
  ];

  for (const detection of detectedObjects) {
    const label = detection.label.toLowerCase();
    if (label.includes("face")) {
      items.push({
        category: "face",
        description: `${detection.count} face${detection.count === 1 ? "" : "s"} blurred`,
        count: detection.count,
      });
    } else if (label.includes("plate")) {
      items.push({
        category: "plate",
        description: "Number plate blurred",
        count: detection.count,
      });
    } else if (label.includes("qr")) {
      items.push({
        category: "qr",
        description: "QR code redacted",
        count: detection.count,
      });
    }
  }

  if (items.length === 1) {
    items.push({
      category: "none",
      description: "No sensitive regions needed blurring",
    });
  }

  return items;
}
