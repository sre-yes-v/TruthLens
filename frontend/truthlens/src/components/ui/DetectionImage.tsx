/**
 * An image with detection boxes drawn over it — the prototype's `.detimg`.
 *
 * Used in three places: OCR text regions, privacy object detections, and the
 * before/after sanitization panels.
 *
 * ON THE MISSING IMAGE
 * The SRS defines no endpoint that returns the analysed image (it stores an
 * `ela_map_ref` and a `sanitized_image_ref`, and serves the sanitized file
 * only through a download endpoint). So `src` is optional everywhere, and
 * when it is absent we draw the prototype's gradient placeholder rather than
 * a broken image. Boxes still render, because their coordinates come from
 * the report and are meaningful on their own. See docs/implementation-notes.md.
 */
import { cn } from "@/lib/utils/cn";
import type { BoundingBox } from "@/types/report";

/** How a box is drawn: an outline, a blur, or a solid redaction. */
export type BoxTreatment = "outline" | "blur" | "redact";

export interface DetectionImageProps {
  /** Real image URL, when the backend provides one. */
  src?: string | null;
  /** Placeholder gradient class, e.g. "ph-street". Used when `src` is absent. */
  placeholderClass?: string;
  boxes?: BoundingBox[];
  treatment?: BoxTreatment;
  /** Shows each box's label above it. */
  showLabels?: boolean;
  /** Caption burned into the bottom-left corner, e.g. "ELA heat map". */
  caption?: string;
  /** Describes the image for screen readers. */
  alt: string;
  className?: string;
}

export function DetectionImage({
  src,
  placeholderClass = "ph-generic",
  boxes = [],
  treatment = "outline",
  showLabels = true,
  caption,
  alt,
  className,
}: DetectionImageProps) {
  return (
    <div
      role="img"
      aria-label={
        boxes.length
          ? `${alt}. ${boxes.length} detected region${boxes.length === 1 ? "" : "s"}.`
          : alt
      }
      className={cn(
        "relative aspect-[4/3] overflow-hidden rounded-card bg-[#c9cdd3]",
        "shadow-[inset_0_0_0_1px_rgba(0,0,0,.06)]",
        className,
      )}
    >
      {src ? (
        // A plain <img>: these are user-uploaded blobs and backend-streamed
        // artifacts on arbitrary hosts, which next/image cannot optimise
        // without a remotePatterns entry per deployment.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className={cn("absolute inset-0", placeholderClass)}
        />
      )}

      {boxes.map((box, index) => (
        <DetectionBox
          key={index}
          box={box}
          treatment={treatment}
          showLabel={showLabels}
        />
      ))}

      {caption && (
        <span className="absolute bottom-2 left-2.5 text-[11px] text-white/85">
          {caption}
        </span>
      )}
    </div>
  );
}

function DetectionBox({
  box,
  treatment,
  showLabel,
}: {
  box: BoundingBox;
  treatment: BoxTreatment;
  showLabel: boolean;
}) {
  // Coordinates arrive as fractions (0–1) and become CSS percentages, so the
  // overlay scales with the container at any viewport width.
  const style = {
    left: `${box.x * 100}%`,
    top: `${box.y * 100}%`,
    width: `${box.width * 100}%`,
    height: `${box.height * 100}%`,
  };

  if (treatment === "redact") {
    return (
      <div aria-hidden="true" className="absolute rounded bg-[#111]" style={style} />
    );
  }

  if (treatment === "blur") {
    return (
      <div
        aria-hidden="true"
        className="absolute rounded border-2 border-white bg-white/25 backdrop-blur-[9px]"
        style={style}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="absolute rounded border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,.35)]"
      style={style}
    >
      {showLabel && box.label && (
        <span className="absolute -top-[9px] -left-0.5 -translate-y-full rounded bg-ink/80 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white">
          {box.label}
        </span>
      )}
    </div>
  );
}
