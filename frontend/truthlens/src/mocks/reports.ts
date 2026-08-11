/**
 * Sample reports for development, ported from the prototype's `CASES` object.
 *
 * WHY MOCKS EXIST
 * The FastAPI backend doesn't exist yet. Without sample data the report
 * screen cannot be built, reviewed, or demonstrated. These four cases cover
 * the outcomes the UI has to handle:
 *
 *   street   — critical privacy risk, strong Kerala regional evidence
 *   hill     — clean image, likely authentic, insufficient regional evidence
 *   portrait — likely AI-generated, metadata stripped
 *   scan     — a degraded engine (OCR unavailable), pipeline still completes
 *
 * IMPORTANT: nothing in `src/mocks/` is imported by `src/lib/api/services.ts`.
 * Mock data reaches the app through exactly one switch, in `lib/api/index.ts`.
 * They are typed as real `Report`s, so if the Report type changes the mocks
 * break at compile time rather than drifting quietly out of date.
 */
import type { BoundingBox, Report } from "@/types/report";

/** Box coordinates are fractions of the image (0–1), same as the real API. */
function box(
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  confidence: number,
): BoundingBox {
  return { x, y, width, height, label, confidence };
}

const hoursFromNow = (hours: number) =>
  new Date(Date.now() + hours * 3600_000).toISOString();

/** Which placeholder gradient to draw when there is no real image URL. */
export type MockPhoto = "street" | "hill" | "portrait" | "scan" | "generic";

export interface MockCase {
  /** The upload key used by the landing page's sample chips. */
  key: string;
  /** Label shown on the sample chip. */
  chipLabel: string;
  /** Dot colour on the sample chip. */
  chipTone: "low" | "mod" | "crit";
  filename: string;
  fileDescriptor: string;
  photo: MockPhoto;
  report: Report;
  /** Set for the "engine degraded" demo path. */
  degradedStep?: "ocr";
  /** Set for the "pipeline failed" demo path. */
  failsAtStep?: "forensics";
}

/* ================================================================
   1. Street scene — privacy critical, Ernakulam
   ================================================================ */

const streetReport: Report = {
  session_id: "a1b2-c3d4",
  report_id: "rep-a1b2-c3d4",
  authenticity_score: 68,
  risk_level: "Low Concern",
  privacy_risk_score: 88,
  forensic_suspicion_score: 24,
  ai_probability_score: 12,
  confidence_level: "Medium",

  metadata: {
    status: "ok",
    summary: "Camera intact · GPS present · edited: no",
    metadata_present: true,
    gps_present: true,
    editing_software_detected: false,
    fields: [
      { label: "Camera", value: "Xiaomi Redmi Note 12" },
      { label: "GPS", value: "9.9312° N, 76.2673° E" },
      { label: "Captured", value: "04 Jan 2026, 14:22" },
      { label: "Editing software", value: "None detected" },
      { label: "Resolution", value: "4000 × 3000" },
      { label: "Color profile", value: "sRGB" },
    ],
    indicators: [
      { level: "critical", text: "GPS location embedded" },
      { level: "info", text: "No editing software found" },
      { level: "info", text: "Capture time matches file time" },
    ],
  },

  ocr: {
    status: "ok",
    summary: "4 sensitive items found",
    findings: [
      {
        category: "phone",
        value: "+91 98••• ••43",
        confidence: 92,
        bounding_box: box(0.12, 0.6, 0.4, 0.11, "phone", 0.92),
      },
      {
        category: "name",
        value: "“R. Menon”",
        confidence: 88,
        bounding_box: box(0.14, 0.74, 0.3, 0.1, "name", 0.88),
      },
      {
        category: "vehicle",
        value: "KL07 CE ••21",
        confidence: 90,
        bounding_box: box(0.22, 0.66, 0.3, 0.09, "plate", 0.9),
      },
      // FR-3.10: below the 60% threshold, surfaced WITH a low-confidence note.
      { category: "address", value: "Address", confidence: 58, low_confidence: true },
    ],
  },

  privacy: {
    status: "ok",
    summary: "Face ×2 · plate · QR · ID document",
    privacy_risk_score: 88,
    risk_band: "Critical",
    detected_objects: [
      {
        label: "Face",
        count: 2,
        confidences: [0.94, 0.88],
        bounding_boxes: [
          box(0.08, 0.14, 0.2, 0.26, "Face 0.94", 0.94),
          box(0.36, 0.2, 0.17, 0.22, "Face 0.88", 0.88),
        ],
      },
      {
        label: "Number plate",
        count: 1,
        confidences: [0.91],
        bounding_boxes: [box(0.2, 0.66, 0.34, 0.14, "Plate 0.91", 0.91)],
      },
      {
        label: "QR code",
        count: 1,
        confidences: [0.86],
        bounding_boxes: [box(0.7, 0.3, 0.16, 0.2, "QR 0.86", 0.86)],
      },
      {
        label: "Aadhaar-like document",
        count: 1,
        confidences: [0.79],
        bounding_boxes: [box(0.6, 0.6, 0.3, 0.26, "ID doc 0.79", 0.79)],
      },
    ],
  },

  forensics: {
    status: "ok",
    summary: "No manipulation signs · single compression",
    forensic_suspicion_score: 24,
    candidate_regions: "None significant",
    compression_generations: "1 (consistent)",
    metadata_cross_check: "None",
    ela_map_url: null,
  },

  ai_assessment: {
    status: "ok",
    summary: "12% likely AI-generated",
    ai_probability_score: 12,
    confidence_level: "Medium",
    signals: [
      { direction: "decreases", label: "Base classifier", value: "15%" },
      { direction: "decreases", label: "Consistent camera EXIF present" },
      { direction: "decreases", label: "Sensor noise typical of a real photo" },
      { direction: "decreases", label: "No garbled-text artifacts" },
    ],
  },

  regional_evidence: {
    status: "ok",
    summary: "Probable region: Ernakulam",
    sufficient_evidence: true,
    regional_confidence_score: 74,
    probable_regions: [
      { region: "Ernakulam", confidence: 74 },
      { region: "Alappuzha", confidence: 18 },
    ],
    evidence_chain: [
      { type: "vehicle_plate", value: "KL07 plate → Ernakulam district", confidence: 85 },
      { type: "std_code", value: "STD code 0484 → Ernakulam", confidence: 80 },
      { type: "malayalam_text", value: "Malayalam text present (corroborating)", confidence: 30 },
      { type: "scene_cue", value: "Backwater scene cue (corroborating)", confidence: 25 },
    ],
  },

  recommendations: [
    {
      severity: "action",
      text: "This image shows a number plate, two unblurred faces and an ID-like document. Sanitize it before sharing.",
    },
    {
      severity: "action",
      text: "GPS coordinates are embedded in the file. Remove metadata to avoid revealing where this was taken.",
    },
  ],

  created_at: new Date().toISOString(),
  expires_at: hoursFromNow(24),
  image_url: null,
};

/* ================================================================
   2. Hillside — clean, likely authentic, insufficient region
   ================================================================ */

const hillReport: Report = {
  session_id: "b7e2-4f19",
  report_id: "rep-b7e2-4f19",
  authenticity_score: 91,
  risk_level: "Likely Authentic",
  privacy_risk_score: 8,
  forensic_suspicion_score: 15,
  ai_probability_score: 6,
  confidence_level: "High",

  metadata: {
    status: "ok",
    summary: "Camera intact · no GPS · edited: no",
    metadata_present: true,
    gps_present: false,
    editing_software_detected: false,
    fields: [
      { label: "Camera", value: "Canon EOS 200D" },
      { label: "GPS", value: "Not embedded" },
      { label: "Captured", value: "20 Dec 2025, 08:41" },
      { label: "Editing software", value: "None detected" },
      { label: "Resolution", value: "6000 × 4000" },
      { label: "Color profile", value: "Adobe RGB" },
    ],
    indicators: [
      { level: "info", text: "No GPS location" },
      { level: "info", text: "No editing software found" },
      { level: "info", text: "Full camera metadata intact" },
    ],
  },

  // Empty findings with status "ok" — genuinely nothing there, which is
  // very different from the engine having failed. The UI shows an empty
  // state, not a warning.
  ocr: { status: "ok", summary: "No readable text found", findings: [] },

  privacy: {
    status: "ok",
    summary: "No sensitive objects detected",
    privacy_risk_score: 8,
    risk_band: "Low",
    detected_objects: [],
  },

  forensics: {
    status: "ok",
    summary: "No manipulation signs · single compression",
    forensic_suspicion_score: 15,
    candidate_regions: "None",
    compression_generations: "1 (consistent)",
    metadata_cross_check: "None",
    ela_map_url: null,
  },

  ai_assessment: {
    status: "ok",
    summary: "6% likely AI-generated",
    ai_probability_score: 6,
    confidence_level: "High",
    signals: [
      { direction: "decreases", label: "Base classifier", value: "8%" },
      { direction: "decreases", label: "Consistent camera EXIF present" },
      { direction: "decreases", label: "Natural sensor noise detected" },
    ],
  },

  regional_evidence: {
    status: "ok",
    summary: "Insufficient evidence for a specific region",
    // FR-8.7 in action: scene cues alone are not enough to name a region.
    sufficient_evidence: false,
    probable_regions: [],
    evidence_chain: [
      { type: "scene_cue", value: "Tea-plantation scene cue (corroborating only)", confidence: 25 },
      { type: "other", value: "No plate, STD code or place name detected", confidence: 0 },
    ],
  },

  recommendations: [
    {
      severity: "ok",
      text: "No sensitive content was detected. This image looks safe to share as it is.",
    },
    {
      severity: "info",
      text: "No location metadata is embedded, so sharing won't reveal where it was taken.",
    },
  ],

  created_at: new Date().toISOString(),
  expires_at: hoursFromNow(24),
  image_url: null,
};

/* ================================================================
   3. Portrait — likely AI-generated, metadata stripped
   ================================================================ */

const portraitReport: Report = {
  session_id: "c4a9-8d02",
  report_id: "rep-c4a9-8d02",
  authenticity_score: 34,
  risk_level: "Moderate Concern",
  privacy_risk_score: 22,
  forensic_suspicion_score: 41,
  ai_probability_score: 87,
  confidence_level: "Medium",

  metadata: {
    status: "ok",
    summary: "Metadata absent or stripped",
    // FR-2.8: reported as a finding in its own right.
    metadata_present: false,
    gps_present: false,
    fields: [
      { label: "Camera", value: "—" },
      { label: "GPS", value: "—" },
      { label: "Captured", value: "—" },
      { label: "Editing software", value: "—" },
      { label: "Format", value: "PNG" },
      { label: "Color profile", value: "sRGB" },
    ],
    indicators: [
      { level: "warning", text: "Metadata absent or stripped (itself a signal)" },
      { level: "info", text: "No camera information present" },
    ],
  },

  ocr: {
    status: "ok",
    summary: "Garbled text artifact detected",
    findings: [
      {
        category: "artifact",
        value: "Non-linguistic text fragment “a'lieﬂ”",
        confidence: 41,
        low_confidence: true,
      },
    ],
  },

  privacy: {
    status: "ok",
    summary: "Face × 1 (appears synthetic)",
    privacy_risk_score: 22,
    risk_band: "Low",
    detected_objects: [
      {
        label: "Face",
        count: 1,
        confidences: [0.83],
        bounding_boxes: [box(0.28, 0.16, 0.44, 0.52, "Face 0.83", 0.83)],
      },
    ],
  },

  forensics: {
    status: "ok",
    summary: "Unusually uniform error levels",
    forensic_suspicion_score: 41,
    candidate_regions: "Uniform low error level (atypical)",
    compression_generations: "N/A (PNG)",
    metadata_cross_check: "ELA pattern lacks camera-sensor noise",
    ela_map_url: null,
  },

  ai_assessment: {
    status: "ok",
    summary: "87% likely AI-generated",
    ai_probability_score: 87,
    confidence_level: "High",
    signals: [
      { direction: "increases", label: "Base classifier", value: "82%" },
      { direction: "increases", label: "No camera metadata present" },
      { direction: "increases", label: "Uniform error level typical of generators" },
      { direction: "increases", label: "Garbled-text artifact detected" },
    ],
  },

  regional_evidence: {
    status: "ok",
    summary: "Insufficient evidence for a specific region",
    sufficient_evidence: false,
    probable_regions: [],
    evidence_chain: [
      {
        type: "other",
        value: "No plate, STD code, place name or scene cue detected",
        confidence: 0,
      },
    ],
  },

  recommendations: [
    {
      severity: "action",
      text: "Several signals suggest this image is AI-generated. Verify the source before treating it as a real photo.",
    },
    {
      severity: "info",
      text: "This is a probabilistic estimate, not a determination. AI-detection accuracy varies and can be wrong.",
    },
  ],

  created_at: new Date().toISOString(),
  expires_at: hoursFromNow(24),
  image_url: null,
};

/* ================================================================
   4. Faded scan — OCR engine unavailable (NFR-2.1 degradation)
   ================================================================ */

const scanReport: Report = {
  ...hillReport,
  session_id: "d1f8-3b60",
  report_id: "rep-d1f8-3b60",
  authenticity_score: 79,
  risk_level: "Low Concern",
  // FR-9.4: fewer engines returned high-confidence output, so overall
  // confidence drops.
  confidence_level: "Low",
  ocr: {
    status: "unavailable",
    summary: "Text check unavailable",
    findings: [],
    unavailable_reason:
      "The scan was too low-contrast to read reliably, so this engine was skipped and excluded from the score. Everything else was analyzed normally. Overall confidence is lowered as a result.",
  },
  created_at: new Date().toISOString(),
  expires_at: hoursFromNow(24),
};

/* ================================================================
   Registry
   ================================================================ */

export const MOCK_CASES: readonly MockCase[] = [
  {
    key: "street",
    chipLabel: "Street photo with ID card",
    chipTone: "crit",
    filename: "street-scene.jpg",
    fileDescriptor: "JPEG · 3.2 MB",
    photo: "street",
    report: streetReport,
  },
  {
    key: "hill",
    chipLabel: "Landscape photo",
    chipTone: "low",
    filename: "hillside.jpg",
    fileDescriptor: "JPEG · 4.1 MB",
    photo: "hill",
    report: hillReport,
  },
  {
    key: "portrait",
    chipLabel: "Possibly AI-generated",
    chipTone: "mod",
    filename: "portrait-dl.png",
    fileDescriptor: "PNG · 1.8 MB",
    photo: "portrait",
    report: portraitReport,
  },
  {
    key: "scan",
    chipLabel: "Low-quality scan",
    chipTone: "mod",
    filename: "faded-scan.jpg",
    fileDescriptor: "JPEG · 2.4 MB",
    photo: "scan",
    report: scanReport,
    degradedStep: "ocr",
  },
] as const;

export function mockCaseByKey(key: string): MockCase | undefined {
  return MOCK_CASES.find((entry) => entry.key === key);
}

export function mockCaseBySessionId(sessionId: string): MockCase | undefined {
  return MOCK_CASES.find((entry) => entry.report.session_id === sessionId);
}

export function mockCaseByReportId(reportId: string): MockCase | undefined {
  return MOCK_CASES.find((entry) => entry.report.report_id === reportId);
}

/** Which placeholder gradient to use for a session, for the analysis screen. */
export function mockPhotoForSession(sessionId: string): MockPhoto {
  return mockCaseBySessionId(sessionId)?.photo ?? "generic";
}
