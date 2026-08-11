"use client";

/**
 * The forensic report (UC-4) — the most important screen in the app.
 *
 * Note how thin this file is. It handles four states (loading, expired,
 * error, loaded) and then composes seven independent section components,
 * each of which receives only its own slice of the report. No section knows
 * about any other, and none of them reads global state.
 *
 * That is the difference between this and a 900-line ReportPage.tsx: to
 * change how OCR findings are displayed you open OCRSection.tsx, and
 * nothing else can break.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/Banner";
import { Spinner } from "@/components/ui/Progress";
import { PageContainer } from "@/components/layout/PageContainer";
import { DownloadModal } from "@/components/modals/DownloadModal";
import { ReportHeader } from "./ReportHeader";
import { ScoreSummary } from "./ScoreSummary";
import { MetadataSection } from "./MetadataSection";
import { OCRSection } from "./OCRSection";
import { PrivacySection } from "./PrivacySection";
import { ForensicsSection } from "./ForensicsSection";
import { AIAnalysisSection } from "./AIAnalysisSection";
import { RegionalEvidenceSection } from "./RegionalEvidenceSection";
import { RecommendationsSection } from "./RecommendationsSection";
import { useReport } from "@/hooks/useReport";
import { describeError, isExpiredError } from "@/lib/utils/errors";
import { routes } from "@/lib/constants/routes";
import { isMockMode } from "@/lib/api";
import { mockCaseByReportId } from "@/mocks/reports";

export function ReportView({ reportId }: { reportId: string }) {
  const router = useRouter();
  const { report, loading, error } = useReport(reportId);
  const [downloadOpen, setDownloadOpen] = useState(false);

  // NFR-4.1: reports are deleted after the retention window. A 404/410 is
  // the expected end of a report's life, not an error — so the user goes to
  // the dedicated expired screen rather than seeing a generic failure.
  useEffect(() => {
    if (error && isExpiredError(error)) {
      router.replace(routes.expired());
    }
  }, [error, router]);

  if (loading) {
    return (
      <PageContainer width="wide">
        <div className="flex flex-col items-center gap-3.5 py-20">
          <Spinner label="Loading report" />
          <p className="text-ink-2">Loading your report…</p>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    // Expired errors are handled by the redirect above; anything reaching
    // here is a genuine failure worth explaining.
    if (isExpiredError(error)) return null;
    const described = describeError(error);
    return (
      <PageContainer width="wide">
        <Banner tone="error" title={`${described.title}.`}>
          {described.body}
        </Banner>
      </PageContainer>
    );
  }

  if (!report) return null;

  // Only relevant in mock mode — with a real backend, `report.image_url`
  // either exists or the placeholder is generic.
  const placeholderClass = isMockMode
    ? `ph-${mockCaseByReportId(reportId)?.photo ?? "generic"}`
    : "ph-generic";

  return (
    <PageContainer width="wide">
      <ReportHeader report={report} onDownloadClick={() => setDownloadOpen(true)} />

      {/* UC-4 alternate flow: a report assembled with a missing required
          field is flagged rather than failing silently. */}
      {report.incomplete && (
        <Banner tone="warning" className="mb-4" title="This report is incomplete.">
          Some findings could not be assembled, so parts of this report may be
          missing. The scores shown were computed from the engines that did
          complete.
        </Banner>
      )}

      <ScoreSummary report={report} />

      <div className="mt-5 flex flex-col gap-3">
        <MetadataSection metadata={report.metadata} />

        <OCRSection
          ocr={report.ocr}
          imageUrl={report.image_url}
          placeholderClass={placeholderClass}
        />

        <PrivacySection
          privacy={report.privacy}
          imageUrl={report.image_url}
          placeholderClass={placeholderClass}
        />

        <ForensicsSection
          forensics={report.forensics}
          placeholderClass={placeholderClass}
        />

        <AIAnalysisSection ai={report.ai_assessment} />

        <RegionalEvidenceSection regional={report.regional_evidence} />

        <RecommendationsSection
          recommendations={report.recommendations}
          sessionId={report.session_id}
          reportId={report.report_id}
          showSanitizeAction={
            report.privacy.risk_band === "Critical" ||
            report.privacy.risk_band === "High"
          }
        />
      </div>

      <DownloadModal
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        reportId={report.report_id}
      />
    </PageContainer>
  );
}
