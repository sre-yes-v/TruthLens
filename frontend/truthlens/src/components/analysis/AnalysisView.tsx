"use client";

/**
 * The live analysis screen (UC-3).
 *
 * The client half of `/analyze/[sessionId]`. All the pipeline logic is in
 * `useAnalysisStream`; this component decides what to show for the state
 * that hook reports.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { AnalysisFailed } from "./AnalysisFailed";
import { AnalysisProgress } from "./AnalysisProgress";
import { AnalysisStepper } from "./AnalysisStepper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAnalysisStream } from "@/hooks/useAnalysisStream";
import { useSessionPreview } from "@/lib/utils/sessionPreview";
import { routes } from "@/lib/constants/routes";
import { isMockMode } from "@/lib/api";
import { mockPhotoForSession } from "@/mocks/reports";

export function AnalysisView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const analysis = useAnalysisStream(sessionId);

  // The thumbnail the upload page handed over. Read through
  // useSyncExternalStore so the server renders a placeholder and the browser
  // fills in the real image without a hydration mismatch.
  const previewUrl = useSessionPreview(sessionId);

  // FR-10.1 / UC-4: `report_ready` carries the report id, and that is the
  // signal to move on. `replace` rather than `push` — going Back should
  // return to the upload page, not to a finished progress bar.
  useEffect(() => {
    if (analysis.reportId) {
      router.replace(routes.report(analysis.reportId));
    }
  }, [analysis.reportId, router]);

  if (analysis.error) {
    return <AnalysisFailed sessionId={sessionId} error={analysis.error} />;
  }

  return (
    <PageContainer>
      <AnalysisProgress
        previewUrl={previewUrl}
        placeholderClass={
          isMockMode ? `ph-${mockPhotoForSession(sessionId)}` : "ph-generic"
        }
        progress={analysis.progress}
        statusMessage={analysis.statusMessage}
        connectionMode={analysis.connectionMode}
      />

      <Card className="p-3">
        <AnalysisStepper steps={analysis.steps} />
      </Card>

      {/*
        FR-5.7 made visible. Sanitization is locked until the report exists,
        because blurring and stripping the image first would destroy the
        evidence the report is built from. Saying so here prevents the user
        from reading the locked button as a bug.
      */}
      <p className="mt-5 flex items-start gap-2 text-[13px] text-ink-3">
        <Lock aria-hidden="true" className="mt-0.5 size-[15px] shrink-0" />
        Sanitizing (blur &amp; strip metadata) unlocks once analysis finishes —
        so evidence is captured first.
      </p>

      <div className="mt-[22px]">
        <Button onClick={() => router.push(routes.home())}>Cancel</Button>
      </div>
    </PageContainer>
  );
}
