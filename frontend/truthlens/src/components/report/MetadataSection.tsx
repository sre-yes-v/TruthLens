/**
 * "Metadata & camera info" (FR-2.x).
 *
 * Left column: the raw extracted fields. Right column: what they mean for
 * the user's privacy and the image's integrity (FR-2.7's risk indicators).
 * Showing both matters — a GPS coordinate means nothing to most people
 * until it is labelled "GPS location embedded".
 */
import { FileText } from "lucide-react";
import { Accordion, SectionColumns } from "@/components/ui/Accordion";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { DegradedNotice } from "@/components/ui/Banner";
import { FieldLabel } from "@/components/ui/Card";
import { FindingList, KeyValueList } from "@/components/ui/DataLists";
import type { MetadataFindings, MetadataIndicatorLevel } from "@/types/report";

const INDICATOR_TONE: Record<MetadataIndicatorLevel, BadgeTone> = {
  critical: "critical",
  warning: "moderate",
  info: "low",
};

const INDICATOR_TAG: Record<MetadataIndicatorLevel, string> = {
  critical: "privacy",
  warning: "note",
  info: "ok",
};

export function MetadataSection({ metadata }: { metadata: MetadataFindings }) {
  const badgeTone: BadgeTone = metadata.gps_present
    ? "critical"
    : !metadata.metadata_present
      ? "moderate"
      : "low";

  const badgeText = metadata.gps_present
    ? "GPS present"
    : !metadata.metadata_present
      ? "Metadata stripped"
      : "Clean";

  return (
    <Accordion
      icon={<FileText className="size-5" />}
      title="Metadata & camera info"
      summary={metadata.summary}
      badge={<Badge tone={badgeTone}>{badgeText}</Badge>}
      // Opened by default, as in the prototype: metadata is the section
      // most users can act on immediately.
      defaultOpen
    >
      {metadata.status !== "ok" ? (
        <DegradedNotice
          reason={
            metadata.unavailable_reason ??
            "The metadata engine did not complete for this image, so these findings were excluded from the score."
          }
        />
      ) : (
        <SectionColumns>
          <div>
            <FieldLabel>Extracted fields</FieldLabel>
            <KeyValueList
              items={metadata.fields.map((field) => ({
                label: field.label,
                value: field.value,
              }))}
            />
          </div>

          <div>
            <FieldLabel>What this means</FieldLabel>
            <FindingList
              items={metadata.indicators.map((indicator) => ({
                tag: INDICATOR_TAG[indicator.level],
                tone: INDICATOR_TONE[indicator.level],
                text: indicator.text,
              }))}
            />
          </div>
        </SectionColumns>
      )}
    </Accordion>
  );
}
