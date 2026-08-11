"use client";

/**
 * "Or try a sample" — the prototype's sample chips.
 *
 * WHY THESE ONLY APPEAR IN MOCK MODE
 * Each chip stands for one of the mock report cases. There are no sample
 * image files in the repository, so with a real backend a chip would have
 * nothing to upload. Rather than ship four buttons that fail, they render
 * only when NEXT_PUBLIC_USE_MOCK_API=true.
 *
 * To enable them against the real backend: drop sample images into
 * `public/samples/`, fetch one here, and pass the resulting File to
 * `onSampleSelected`. The rest of the flow already works — a sample is just
 * a File like any other. Noted in docs/implementation-notes.md.
 */
import { isMockMode } from "@/lib/api";
import { MOCK_CASES } from "@/mocks/reports";
import { cn } from "@/lib/utils/cn";

const TONE_DOT: Record<"low" | "mod" | "crit", string> = {
  low: "bg-green",
  mod: "bg-amber",
  crit: "bg-red",
};

export function SampleImageChips({
  onSampleSelected,
}: {
  onSampleSelected: (file: File) => void;
}) {
  if (!isMockMode) return null;

  /**
   * Builds a placeholder File named after the mock case. The mock upload
   * service reads that filename to decide which sample report to return —
   * see `src/mocks/mockApi.ts#caseForFilename`. The bytes are irrelevant
   * because nothing decodes them in mock mode.
   */
  function pickSample(filename: string, mimeType: string) {
    const placeholder = new File([new Uint8Array(8)], filename, {
      type: mimeType,
    });
    onSampleSelected(placeholder);
  }

  return (
    <div className="mt-[22px]">
      <p className="mb-2.5 text-[13px] text-ink-2">Or try a sample</p>
      <div className="flex flex-wrap justify-center gap-2">
        {MOCK_CASES.map((sample) => (
          <button
            key={sample.key}
            type="button"
            onClick={() =>
              pickSample(
                sample.filename,
                sample.filename.endsWith(".png") ? "image/png" : "image/jpeg",
              )
            }
            className="inline-flex items-center gap-[7px] rounded-full border border-divider-2 bg-card px-3.5 py-2 text-[13px] font-medium text-ink shadow-card transition-colors duration-100 hover:border-blue hover:bg-blue-wash"
          >
            <span
              aria-hidden="true"
              className={cn("size-2 rounded-full", TONE_DOT[sample.chipTone])}
            />
            {sample.chipLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
