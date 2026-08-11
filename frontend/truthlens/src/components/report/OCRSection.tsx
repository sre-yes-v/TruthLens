/**
 * "Text & personal info" (FR-3.x).
 *
 * Three distinct states, and keeping them distinct is the point:
 *   • degraded  — the OCR engine didn't run (NFR-2.1)
 *   • empty     — it ran and found no text
 *   • findings  — it found sensitive items
 *
 * "No text found" and "we couldn't check for text" mean very different
 * things to someone deciding whether to post a photo, so the report never
 * renders one as the other.
 */
import { Type } from "lucide-react";
import { Accordion, SectionColumns } from "@/components/ui/Accordion";
import { Badge } from "@/components/ui/Badge";
import { DegradedNotice } from "@/components/ui/Banner";
import { FieldLabel } from "@/components/ui/Card";
import { EmptyState, FindingList } from "@/components/ui/DataLists";
import { DetectionImage } from "@/components/ui/DetectionImage";
import type { OcrFindings } from "@/types/report";

export function OCRSection({
  ocr,
  imageUrl,
  placeholderClass,
}: {
  ocr: OcrFindings;
  imageUrl?: string | null;
  placeholderClass: string;
}) {
  const degraded = ocr.status !== "ok";
  const empty = !degraded && ocr.findings.length === 0;

  const badge = degraded ? (
    <Badge tone="moderate">Skipped</Badge>
  ) : empty ? (
    <Badge tone="low">None</Badge>
  ) : (
    <Badge tone={ocr.findings.some((f) => !f.low_confidence) ? "moderate" : "low"}>
      {ocr.findings.length} finding{ocr.findings.length === 1 ? "" : "s"}
    </Badge>
  );

  // FR-3.2: only findings that carry a bounding box can be drawn on the image.
  const boxes = ocr.findings
    .map((finding) => finding.bounding_box)
    .filter((box): box is NonNullable<typeof box> => Boolean(box));

  return (
    <Accordion
      icon={<Type className="size-5" />}
      title="Text & personal info"
      summary={ocr.summary}
      badge={badge}
    >
      {degraded ? (
        <DegradedNotice
          reason={
            ocr.unavailable_reason ??
            "The text engine was skipped for this image and excluded from the score. Everything else was analyzed normally."
          }
        />
      ) : empty ? (
        <EmptyState message="No visible text was detected in this image." />
      ) : (
        <SectionColumns>
          <div>
            <FieldLabel>Text found on the image</FieldLabel>
            <DetectionImage
              src={imageUrl}
              placeholderClass={placeholderClass}
              boxes={boxes}
              alt="Analyzed image with recognised text regions outlined"
            />
          </div>

          <div>
            <FieldLabel>Sensitive items</FieldLabel>
            <FindingList
              items={ocr.findings.map((finding) => ({
                tag: finding.category,
                tone: finding.low_confidence ? "moderate" : "neutral",
                text: (
                  <>
                    {finding.value}
                    {/* FR-3.10: low-confidence results are surfaced, but
                        never without saying so. */}
                    {finding.low_confidence && (
                      <span className="text-ink-2">
                        {" "}
                        (low confidence
                        {finding.confidence ? `, ${Math.round(finding.confidence)}%` : ""}
                        )
                      </span>
                    )}
                  </>
                ),
              }))}
            />
          </div>
        </SectionColumns>
      )}
    </Accordion>
  );
}
