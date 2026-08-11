/**
 * Side-by-side original and sanitized image — the prototype's `.san-grid`.
 *
 * The left panel outlines what was detected; the right panel shows the same
 * regions blurred (faces, plates — FR-5.3/5.4) or solidly redacted (QR
 * codes — FR-5.5, since a QR can encode an arbitrary payload and a blur may
 * not defeat a determined decoder).
 *
 * Stacks to one column below 640px: two 4:3 panels side by side on a phone
 * would make each too small to judge, which defeats the purpose of a
 * comparison.
 */
import { Card } from "@/components/ui/Card";
import { DetectionImage } from "@/components/ui/DetectionImage";
import type { SanitizeResult } from "@/types/sanitize";

/**
 * The prototype's `.san-panel .cap` — a caption row with the panel name on
 * the left and its status on the right.
 *
 * Written as its own small component rather than reusing `FieldLabel` with
 * an `mb-0` override: `FieldLabel` sets `mb-2`, and a second margin utility
 * passed through `className` does not reliably win (see `lib/utils/cn.ts`).
 */
function PanelCaption({
  title,
  status,
  statusTone,
}: {
  title: string;
  status: string;
  statusTone?: "green";
}) {
  return (
    <div className="mb-2 flex justify-between">
      <span className="text-xs font-bold tracking-[0.4px] text-ink-3 uppercase">
        {title}
      </span>
      <span
        className={
          "text-xs " +
          (statusTone === "green" ? "font-semibold text-green" : "text-ink-2")
        }
      >
        {status}
      </span>
    </div>
  );
}

export function BeforeAfterViewer({
  result,
  placeholderClass,
}: {
  result: SanitizeResult;
  placeholderClass: string;
}) {
  const allRegions = [...result.blurred_regions, ...result.redacted_regions];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card padded>
        <PanelCaption title="Original" status="reference" />
        <DetectionImage
          src={result.original_image_url}
          placeholderClass={placeholderClass}
          boxes={allRegions}
          alt="The original image with sensitive regions outlined"
        />
      </Card>

      <Card padded>
        <PanelCaption title="Sanitized" status="ready" statusTone="green" />
        {/* Two overlapping passes: blurred regions, then hard redactions. */}
        <div className="relative">
          <DetectionImage
            src={result.sanitized_image_url}
            placeholderClass={placeholderClass}
            boxes={result.blurred_regions}
            treatment="blur"
            showLabels={false}
            alt="The sanitized image with sensitive regions blurred"
          />
          {result.redacted_regions.map((region, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="absolute rounded bg-[#111]"
              style={{
                left: `${region.x * 100}%`,
                top: `${region.y * 100}%`,
                width: `${region.width * 100}%`,
                height: `${region.height * 100}%`,
              }}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
