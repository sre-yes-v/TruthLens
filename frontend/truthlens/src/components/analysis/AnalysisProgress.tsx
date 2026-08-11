/**
 * The header of the analysis screen: thumbnail, heading, progress bar,
 * percentage, and the live status line.
 *
 * Also surfaces the connection mode. When the SSE stream drops and polling
 * takes over (FR-10.4), the user is told rather than left wondering why
 * updates went from instant to every few seconds — and an examiner can see
 * the fallback actually working.
 */
import { RefreshCw } from "lucide-react";
import { ProgressBar } from "@/components/ui/Progress";
import { TOTAL_ANALYSIS_STEPS } from "@/lib/constants/analysis";
import type { AnalysisConnectionMode } from "@/types/analysis";

export function AnalysisProgress({
  previewUrl,
  placeholderClass,
  progress,
  statusMessage,
  connectionMode,
}: {
  previewUrl: string | null;
  placeholderClass: string;
  progress: number;
  statusMessage: string;
  connectionMode: AnalysisConnectionMode;
}) {
  return (
    <>
      <div className="mb-2 flex items-center gap-4">
        <div className="size-16 shrink-0 overflow-hidden rounded-card bg-[#dfe3e8]">
          {previewUrl ? (
            // A local blob URL from the upload step — see
            // lib/utils/sessionPreview.ts for why this can be absent.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="The image being analyzed"
              className="size-full object-cover"
            />
          ) : (
            <div aria-hidden="true" className={`size-full ${placeholderClass}`} />
          )}
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-[-0.3px]">
            Analyzing your image
          </h1>
          <p className="text-[13px] text-ink-2">
            Running {TOTAL_ANALYSIS_STEPS} checks — this usually takes a few
            seconds
          </p>
        </div>
      </div>

      <div className="mt-[18px]">
        <ProgressBar value={progress} label="Analysis progress" />
      </div>
      <div className="mt-1.5 text-[13px] text-ink-2">{Math.round(progress)}%</div>

      <p className="mt-3.5 mb-5 text-base font-semibold">{statusMessage}</p>

      {connectionMode === "polling" && (
        <p className="-mt-3 mb-5 flex items-center gap-2 text-[13px] text-ink-2">
          <RefreshCw aria-hidden="true" className="size-3.5" />
          Live updates were interrupted — checking for progress every few
          seconds instead.
        </p>
      )}
    </>
  );
}
