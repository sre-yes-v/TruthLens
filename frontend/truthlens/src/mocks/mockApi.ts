/**
 * The mock implementation of `TruthLensApi`.
 *
 * Enabled with NEXT_PUBLIC_USE_MOCK_API=true. It implements the same
 * interface as the real client, so the entire app — every hook, every
 * component, every error path — runs unchanged against fake data.
 *
 * It also mimics the parts of the backend's *behaviour* that the UI must
 * handle, not just its data: a 409 when sanitizing an unknown session, a
 * 404 for a missing report, and realistic latency so loading states are
 * actually visible during development.
 */
import { openMockAnalysisStream } from "./mockStream";
import { buildMockAdminOverview } from "./admin";
import {
  MOCK_CASES,
  mockCaseByReportId,
  mockCaseBySessionId,
} from "./reports";
import { toSanitizeResult } from "@/lib/api/mappers";
import { ApiError } from "@/types/errors";
import type {
  AnalysisStatusResponse,
  DownloadedFile,
  ReportDownloadFormat,
  SanitizeResponse,
  UploadResponse,
} from "@/types/api";
import type { AdminOverview } from "@/types/admin";
import type { Report } from "@/types/report";
import type { TruthLensApi } from "@/lib/api/contract";

/** Simulated network latency, so loading states are visible. */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Picks which sample case an upload becomes.
 *
 * The landing page's sample chips create files named after the mock cases,
 * so choosing one shows that case's report. A genuinely picked file has no
 * matching name and falls back to the street case — the richest one, and
 * the most useful for development.
 */
function caseForFilename(filename: string) {
  return (
    MOCK_CASES.find((entry) => entry.filename === filename) ?? MOCK_CASES[0]
  );
}

/** Tracks which sessions have had sanitization run, to model UC-5's gate. */
const sanitizedSessions = new Set<string>();

export const mockApi: TruthLensApi = {
  async uploadImage(file: File): Promise<UploadResponse> {
    await delay(700);
    return { session_id: caseForFilename(file.name).report.session_id };
  },

  openAnalysisStream: openMockAnalysisStream,

  /**
   * The polling fallback. In mock mode the stream never actually drops, so
   * this is exercised by the prototype-map "SSE disconnected" entry — it
   * reports the pipeline as already finished, which is what a real backend
   * would say by the time a client reconnected.
   */
  async getAnalysisStatus(sessionId: string): Promise<AnalysisStatusResponse> {
    await delay(300);
    const found = mockCaseBySessionId(sessionId);
    return {
      session_id: sessionId,
      stage: "report",
      progress: 100,
      status: "completed",
      report_id: found?.report.report_id ?? null,
      message: "Report ready",
    };
  },

  async getReport(reportId: string): Promise<Report> {
    await delay(500);
    const found = mockCaseByReportId(reportId);
    if (!found) {
      // Same shape a real 404 produces, so the expired-report path can be
      // tested without a backend.
      throw new ApiError({
        error_code: "report_not_found",
        message: "This report no longer exists.",
        session_id: null,
        status: 404,
      });
    }
    return found.report;
  },

  async downloadReport(
    reportId: string,
    format: ReportDownloadFormat,
  ): Promise<DownloadedFile> {
    await delay(600);
    const found = mockCaseByReportId(reportId);
    if (!found) {
      throw new ApiError({
        error_code: "report_not_found",
        message: "This report no longer exists.",
        session_id: null,
        status: 404,
      });
    }

    // JSON is a real serialisation of the mock report. "PDF" is a plain-text
    // stand-in: generating a real PDF is the backend's job (FR-11.3), and
    // faking one client-side would hide that dependency.
    if (format === "json") {
      return {
        blob: new Blob([JSON.stringify(found.report, null, 2)], {
          type: "application/json",
        }),
        filename: `truthlens-report-${reportId}.json`,
      };
    }

    return {
      blob: new Blob(
        [
          `TruthLens forensic report (mock)\n\nReport: ${reportId}\nAuthenticity score: ${found.report.authenticity_score}/100\nRisk level: ${found.report.risk_level}\n\nThe real PDF is rendered by the backend (FR-11.3).\n`,
        ],
        { type: "text/plain" },
      ),
      filename: `truthlens-report-${reportId}.txt`,
    };
  },

  async sanitizeImage(sessionId: string): Promise<SanitizeResponse> {
    await delay(1100);
    const found = mockCaseBySessionId(sessionId);
    if (!found) {
      // UC-5 alternate flow: no completed report for this session → 409.
      throw new ApiError({
        error_code: "report_not_ready",
        message:
          "Sanitization is only available once the forensic report is complete.",
        session_id: sessionId,
        status: 409,
      });
    }

    sanitizedSessions.add(sessionId);
    const result = toSanitizeResult(
      { session_id: sessionId, sanitized_image_id: `san-${sessionId}` },
      found.report.privacy.detected_objects,
    );
    return {
      session_id: result.session_id,
      sanitized_image_id: result.sanitized_image_id,
      sanitization_summary: result.summary,
    };
  },

  async downloadSanitizedImage(sessionId: string): Promise<DownloadedFile> {
    await delay(500);
    if (!sanitizedSessions.has(sessionId)) {
      throw new ApiError({
        error_code: "sanitized_image_not_found",
        message: "No sanitized image exists for this session yet.",
        session_id: sessionId,
        status: 404,
      });
    }
    return {
      blob: new Blob(
        ["Mock sanitized image — the real file comes from the backend.\n"],
        { type: "text/plain" },
      ),
      filename: `truthlens-sanitized-${sessionId}.txt`,
    };
  },

  async deleteSession(sessionId: string): Promise<void> {
    await delay(300);
    sanitizedSessions.delete(sessionId);
  },

  async getAdminOverview(): Promise<AdminOverview> {
    await delay(400);
    return buildMockAdminOverview();
  },
};
