/**
 * "Probable region" — the Kerala Regional Evidence Engine (FR-8.x).
 *
 * The one section with a hard rule about what it may NOT say. FR-8.7:
 * without at least one medium-or-higher-confidence item (vehicle plate,
 * STD code, or a specific place name), the system must report "insufficient
 * evidence" rather than guessing. Scene cues and Malayalam text alone are
 * corroborating evidence, never a conclusion.
 *
 * So `sufficient_evidence === false` renders a warning and the raw clues —
 * it never falls back to showing the top candidate anyway.
 *
 * FR-8.8 additionally requires every regional output to state that this is
 * not GPS geolocation, which is why the caveat is outside the conditional.
 */
import { MapPin } from "lucide-react";
import { Accordion } from "@/components/ui/Accordion";
import { Badge } from "@/components/ui/Badge";
import { Banner, DegradedNotice, MiniDisclaimer } from "@/components/ui/Banner";
import { FieldLabel } from "@/components/ui/Card";
import type { RegionalEvidence } from "@/types/report";

export function RegionalEvidenceSection({
  regional,
}: {
  regional: RegionalEvidence;
}) {
  const degraded = regional.status !== "ok";
  const topRegion = regional.probable_regions[0];

  const badge = degraded ? (
    <Badge tone="moderate">Skipped</Badge>
  ) : regional.sufficient_evidence && topRegion ? (
    <Badge tone="low">{topRegion.region}</Badge>
  ) : (
    <Badge tone="moderate">Insufficient</Badge>
  );

  return (
    <Accordion
      icon={<MapPin className="size-5" />}
      title="Probable region"
      summary={regional.summary}
      badge={badge}
    >
      {degraded ? (
        <DegradedNotice
          reason={
            regional.unavailable_reason ??
            "The regional-evidence engine did not complete for this image."
          }
        />
      ) : (
        <>
          {regional.sufficient_evidence ? (
            <>
              {/* FR-8.9: a ranked list of candidates, not a single guess. */}
              <div className="mb-3.5 flex flex-col gap-2.5">
                {regional.probable_regions.map((region) => (
                  <div key={region.region} className="flex items-center gap-3">
                    <div className="w-[130px] shrink-0 font-semibold">
                      {region.region}
                    </div>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-divider-2">
                      <span
                        className="block h-full rounded-full bg-blue"
                        style={{ width: `${region.confidence}%` }}
                      />
                    </div>
                    <div className="w-11 text-right text-[13px] font-semibold">
                      {Math.round(region.confidence)}%
                    </div>
                  </div>
                ))}
              </div>

              <FieldLabel>Evidence chain</FieldLabel>
              <EvidenceChain items={regional.evidence_chain} />
            </>
          ) : (
            <>
              <Banner
                tone="warning"
                title="Not enough evidence to name a region."
              >
                Only weak, corroborating-only cues were found — no vehicle
                plate, STD code or specific place name — so TruthLens
                won&apos;t guess.
              </Banner>

              <div className="mt-3.5">
                <FieldLabel>What was found</FieldLabel>
                <EvidenceChain items={regional.evidence_chain} forceLow />
              </div>
            </>
          )}

          <MiniDisclaimer icon={<MapPin className="size-4" />}>
            This is inference from visible clues — <b>not GPS geolocation</b>.
            A staged or relocated photo (for example a Kerala plate
            photographed elsewhere) can mislead it.
          </MiniDisclaimer>
        </>
      )}
    </Accordion>
  );
}

/**
 * FR-8.6's Evidence Chain: each item with its own confidence contribution,
 * so a "high" plate match reads differently from a "low" scene cue.
 */
function EvidenceChain({
  items,
  forceLow = false,
}: {
  items: RegionalEvidence["evidence_chain"];
  forceLow?: boolean;
}) {
  return (
    <ul className="m-0 list-none p-0">
      {items.map((item, index) => {
        const high = !forceLow && item.confidence >= 50;
        return (
          <li
            key={index}
            className={
              "flex items-center gap-3 py-2.5 text-sm" +
              (index < items.length - 1
                ? " border-b border-dashed border-divider-2"
                : "")
            }
          >
            <span
              className={
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold " +
                (high ? "bg-green-bg text-green" : "bg-grey text-ink-2")
              }
            >
              {high ? "high" : "low"}
            </span>
            {item.value}
          </li>
        );
      })}
    </ul>
  );
}
