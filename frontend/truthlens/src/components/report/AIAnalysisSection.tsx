/**
 * "AI-generation likelihood" (FR-7.x).
 *
 * FR-7.6 is absolute: this must never render as a binary "AI-generated:
 * Yes/No". So the section shows a probability, a confidence level, and the
 * signals that moved the estimate — up (red ▲) or down (green ▼).
 *
 * FR-9.5's explainability requirement is what the signal list is for: a
 * user can see *why* the number is what it is instead of being handed an
 * opaque verdict.
 */
import { Bot, Info, TrendingDown, TrendingUp } from "lucide-react";
import { Accordion } from "@/components/ui/Accordion";
import { Badge, toneForScore } from "@/components/ui/Badge";
import { DegradedNotice, MiniDisclaimer } from "@/components/ui/Banner";
import { FieldLabel } from "@/components/ui/Card";
import { KeyValueList } from "@/components/ui/DataLists";
import type { AiAssessment } from "@/types/report";

export function AIAnalysisSection({ ai }: { ai: AiAssessment }) {
  const degraded = ai.status !== "ok";
  const tone = toneForScore(ai.ai_probability_score);
  const label =
    ai.ai_probability_score >= 61
      ? "High"
      : ai.ai_probability_score >= 31
        ? "Moderate"
        : "Low";

  return (
    <Accordion
      icon={<Bot className="size-5" />}
      title="AI-generation likelihood"
      summary={ai.summary}
      badge={
        <Badge tone={degraded ? "moderate" : tone}>
          {degraded ? "Skipped" : label}
        </Badge>
      }
    >
      {degraded ? (
        <DegradedNotice
          reason={
            ai.unavailable_reason ??
            "The AI-assessment engine did not complete for this image, so no probability estimate is available."
          }
        />
      ) : (
        <div className="max-w-[560px]">
          <div className="mb-3">
            <KeyValueList
              items={[
                {
                  label: "Estimated probability",
                  value: `${Math.round(ai.ai_probability_score)}%`,
                },
                { label: "Confidence", value: ai.confidence_level },
              ]}
            />
          </div>

          <FieldLabel>How we got there</FieldLabel>
          <ul className="m-0 list-none p-0">
            {ai.signals.map((signal, index) => (
              <li
                key={index}
                className={
                  "flex items-center gap-2.5 py-2 text-sm" +
                  (index < ai.signals.length - 1
                    ? " border-b border-dashed border-divider-2"
                    : "")
                }
              >
                {signal.direction === "increases" ? (
                  <TrendingUp
                    aria-label="Increases the estimate"
                    className="size-4 shrink-0 text-red"
                  />
                ) : (
                  <TrendingDown
                    aria-label="Decreases the estimate"
                    className="size-4 shrink-0 text-green"
                  />
                )}
                <span className="flex-1">{signal.label}</span>
                {signal.value && (
                  <span className="text-[13px] text-ink-2">{signal.value}</span>
                )}
              </li>
            ))}
          </ul>

          <MiniDisclaimer icon={<Info className="size-4" />}>
            Shown as a probability, never a yes/no label. AI-detection is
            imperfect and degrades as generators improve.
          </MiniDisclaimer>
        </div>
      )}
    </Accordion>
  );
}
