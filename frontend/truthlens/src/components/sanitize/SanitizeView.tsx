"use client";

/**
 * The sanitization screen (UC-5).
 *
 * Flow: load the report (for its detections) → POST sanitize → show
 * before/after and the summary → offer the download.
 *
 * The 409 case gets its own treatment. It is not a bug and not a server
 * error: FR-5.7 has the orchestration layer refuse to sanitize before the
 * forensic report is captured, because blurring first would destroy the
 * evidence the report is built from. The user is told exactly that.
 */
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { BeforeAfterViewer } from "./BeforeAfterViewer";
import { SanitizationSummary } from "./SanitizationSummary";
import { Banner } from "@/components/ui/Banner";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card, FieldLabel } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Progress";
import { PageContainer } from "@/components/layout/PageContainer";
import { useReport } from "@/hooks/useReport";
import { useSanitize } from "@/hooks/useSanitize";
import { useToast } from "@/hooks/useToast";
import { api, isMockMode } from "@/lib/api";
import { routes } from "@/lib/constants/routes";
import { saveBlob } from "@/lib/utils/download";
import { describeError, isSanitizeConflict, normalizeError } from "@/lib/utils/errors";
import { mockCaseBySessionId } from "@/mocks/reports";

export function SanitizeView({
  sessionId,
  reportId,
}: {
  sessionId: string;
  /** From `?report=` — used for the back link and the privacy detections. */
  reportId: string | null;
}) {
  const { toast, toastError } = useToast();
  const { report, loading: reportLoading } = useReport(reportId);
  const [downloading, setDownloading] = useState(false);

  const sanitize = useSanitize(
    sessionId,
    report?.privacy.detected_objects,
    // Wait for the report request to settle so the detections are available.
    // If there is no report id we start immediately.
    !reportLoading,
  );

  const placeholderClass = isMockMode
    ? `ph-${mockCaseBySessionId(sessionId)?.photo ?? "generic"}`
    : "ph-generic";

  async function handleDownload() {
    setDownloading(true);
    try {
      const file = await api.downloadSanitizedImage(sessionId);
      saveBlob(file.blob, file.filename);
      toast("Sanitized image downloaded");
    } catch (error) {
      toastError(normalizeError(error).message);
    } finally {
      setDownloading(false);
    }
  }

  const backHref = reportId ? routes.report(reportId) : routes.home();
  const backLabel = reportId ? "Back to report" : "Start a new analysis";

  return (
    <PageContainer>
      <Link
        href={backHref}
        className={buttonClasses({ variant: "ghost", size: "sm", className: "mb-3.5" })}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {backLabel}
      </Link>

      <h1 className="text-xl font-bold tracking-[-0.3px]">Sanitized image</h1>
      <p className="mt-1.5 mb-5 text-[13px] text-ink-2">
        Metadata removed and sensitive regions blurred. Your original report is
        untouched.
      </p>

      {/* ---------- Working ---------- */}
      {(reportLoading || sanitize.loading) && (
        <Card padded className="text-center">
          <div className="mx-auto mb-3.5 w-fit">
            <Spinner label="Sanitizing image" />
          </div>
          <p className="text-ink-2">
            Stripping metadata and blurring regions…
          </p>
        </Card>
      )}

      {/* ---------- Failed ---------- */}
      {!sanitize.loading && sanitize.error && (
        <SanitizeError
          conflict={isSanitizeConflict(sanitize.error)}
          title={describeError(sanitize.error).title}
          body={describeError(sanitize.error).body}
          onRetry={sanitize.retry}
        />
      )}

      {/* ---------- Done ---------- */}
      {!sanitize.loading && sanitize.result && (
        <>
          <BeforeAfterViewer
            result={sanitize.result}
            placeholderClass={placeholderClass}
          />

          <Card padded className="mt-4">
            <FieldLabel>What was changed</FieldLabel>
            <SanitizationSummary items={sanitize.result.summary} />

            <div className="mt-[18px] flex flex-wrap gap-2.5">
              <Button
                variant="primary"
                loading={downloading}
                onClick={handleDownload}
              >
                <Download aria-hidden="true" className="size-4" />
                Download sanitized image
              </Button>
              <Link href={backHref} className={buttonClasses()}>
                {backLabel}
              </Link>
            </div>
          </Card>

          {/* FR-5.8: the original is preserved untouched; the sanitized file
              is a separate derived artifact. Saying so reassures the user
              that acting on the recommendation doesn't invalidate the report. */}
          <p className="mt-4 text-[13px] text-ink-3">
            The original image and its forensic report are unchanged — this
            sanitized copy is a separate file.
          </p>
        </>
      )}
    </PageContainer>
  );
}

function SanitizeError({
  conflict,
  title,
  body,
  onRetry,
}: {
  conflict: boolean;
  title: string;
  body: string;
  onRetry: () => void;
}) {
  return (
    <>
      <Banner tone={conflict ? "warning" : "error"} title={`${title}.`}>
        {body}
      </Banner>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {/* Retrying a 409 is pointless — the report genuinely isn't ready,
            and hammering the endpoint won't change that. */}
        {!conflict && <Button onClick={onRetry}>Try again</Button>}
        <Link
          href={routes.home()}
          className={buttonClasses({ variant: conflict ? "primary" : "default" })}
        >
          Analyze an image
        </Link>
      </div>
    </>
  );
}
