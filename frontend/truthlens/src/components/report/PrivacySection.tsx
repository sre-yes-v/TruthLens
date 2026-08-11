/**
 * "What this image reveals" — detected privacy-sensitive objects (FR-4.x).
 *
 * The image with boxes on the left, the object list with confidences on the
 * right. These are the same bounding boxes the sanitizer will blur (FR-5.3
 * – FR-5.5), which is why the caveat at the bottom points that out — it
 * connects what was found to what the user can do about it.
 */
import { Info, ShieldAlert } from "lucide-react";
import { Accordion, SectionColumns } from "@/components/ui/Accordion";
import { Badge, toneForPrivacyBand } from "@/components/ui/Badge";
import { DegradedNotice, MiniDisclaimer } from "@/components/ui/Banner";
import { FieldLabel } from "@/components/ui/Card";
import { EmptyState, FindingList } from "@/components/ui/DataLists";
import { DetectionImage } from "@/components/ui/DetectionImage";
import { formatConfidence } from "@/lib/utils/formatters";
import type { PrivacyFindings } from "@/types/report";

export function PrivacySection({
  privacy,
  imageUrl,
  placeholderClass,
}: {
  privacy: PrivacyFindings;
  imageUrl?: string | null;
  placeholderClass: string;
}) {
  const degraded = privacy.status !== "ok";
  const empty = !degraded && privacy.detected_objects.length === 0;
  const tone = toneForPrivacyBand(privacy.risk_band);

  const boxes = privacy.detected_objects.flatMap(
    (detection) => detection.bounding_boxes,
  );

  return (
    <Accordion
      icon={<ShieldAlert className="size-5" />}
      title="What this image reveals"
      summary={privacy.summary}
      badge={<Badge tone={degraded ? "moderate" : tone}>{degraded ? "Skipped" : privacy.risk_band}</Badge>}
    >
      {degraded ? (
        <DegradedNotice
          reason={
            privacy.unavailable_reason ??
            "The object-detection engine did not complete for this image, so no privacy detections are available and this engine was excluded from the score."
          }
        />
      ) : empty ? (
        <EmptyState message="No faces, plates, QR codes or documents were detected." />
      ) : (
        <SectionColumns>
          <div>
            <FieldLabel>Detected regions</FieldLabel>
            <DetectionImage
              src={imageUrl}
              placeholderClass={placeholderClass}
              boxes={boxes}
              alt="Analyzed image with detected sensitive regions outlined"
            />
          </div>

          <div>
            <FieldLabel>Detected objects</FieldLabel>
            <FindingList
              items={privacy.detected_objects.map((detection) => ({
                tag: "obj",
                tone,
                text:
                  detection.count > 1
                    ? `${detection.label} × ${detection.count}`
                    : detection.label,
                // FR-4.8: every detection carries its confidence, so the
                // user can weigh a 0.79 differently from a 0.94.
                trailing: detection.confidences.map(formatConfidence).join(", "),
              }))}
            />

            <MiniDisclaimer icon={<Info className="size-4" />}>
              These detections feed the Privacy risk score and the Sanitize
              step.
            </MiniDisclaimer>
          </div>
        </SectionColumns>
      )}
    </Accordion>
  );
}
