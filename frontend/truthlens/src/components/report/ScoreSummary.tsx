/**
 * The top of the report: the Authenticity Score ring and three sub-scores.
 *
 * The two-column layout (fixed 220px ring, flexible sub-scores) collapses to
 * one column below 680px, matching the prototype's `.summary` grid.
 *
 * NFR-7.2 requires every score to carry a one-line plain-language
 * explanation rather than just a number, which is what the caption under
 * each sub-score is for.
 */
import { Card } from "@/components/ui/Card";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { ProgressBar } from "@/components/ui/Progress";
import {
  Badge,
  TONE_FILL,
  toneForPrivacyBand,
  toneForScore,
  type BadgeTone,
} from "@/components/ui/Badge";
import type { Report } from "@/types/report";

export function ScoreSummary({ report }: { report: Report }) {
  return (
    <div className="grid gap-[18px] md:grid-cols-[220px_1fr]">
      <Card className="flex flex-col items-center p-[22px] text-center">
        <ScoreRing score={report.authenticity_score} label="Authenticity score" />

        {/*
          FR-9.3's risk level, in the SRS's own deliberately non-absolute
          wording — "Likely Authentic", never "Authentic". FR-9.6 forbids
          presenting this as a determination.
        */}
        <div className="mt-3.5 text-[17px] font-bold">{report.risk_level}</div>
        <div className="mt-0.5 text-[13px] text-ink-2">
          Authenticity · confidence {report.confidence_level}
        </div>
      </Card>

      <div className="flex flex-col justify-center gap-3">
        <SubScore
          label="Privacy risk"
          value={report.privacy_risk_score}
          tone={toneForPrivacyBand(report.privacy.risk_band)}
          badge={report.privacy.risk_band}
          description={describePrivacy(report.privacy.risk_band)}
        />
        <SubScore
          label="Manipulation signs"
          value={report.forensic_suspicion_score}
          tone={toneForScore(report.forensic_suspicion_score)}
          description={describeForensic(report.forensic_suspicion_score)}
        />
        <SubScore
          label="AI-generated likelihood"
          value={report.ai_probability_score}
          suffix="%"
          tone={toneForScore(report.ai_probability_score)}
          // FR-7.6: always a probability with a confidence, never a verdict.
          description={`${describeAi(report.ai_probability_score)} · ${report.ai_assessment.confidence_level.toLowerCase()} confidence`}
        />
      </div>
    </div>
  );
}

function SubScore({
  label,
  value,
  suffix = "",
  tone,
  badge,
  description,
}: {
  label: string;
  value: number;
  suffix?: string;
  tone: BadgeTone;
  badge?: string;
  description: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3.5 rounded-card border border-divider-2 px-4 py-3.5">
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-full"
        style={{ background: TONE_FILL[tone] }}
      />

      <div className="min-w-[120px]">
        <div className="text-[13px] text-ink-2">{label}</div>
        <div className="text-lg font-bold">
          {Math.round(value)}
          {suffix}
        </div>
      </div>

      <div className="min-w-[80px] flex-1">
        <ProgressBar value={value} tone={tone} height={8} label={label} />
      </div>

      {badge ? (
        <Badge tone={tone}>{badge}</Badge>
      ) : (
        <span className="text-[13px] text-ink-2">{description}</span>
      )}

      {/* With a badge shown, the plain-language line moves to its own row so
          NFR-7.2 is satisfied either way. */}
      {badge && (
        <p className="w-full text-[13px] text-ink-2">{description}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   NFR-7.2: one plain sentence per score. Written here rather than in the
   backend so the wording stays consistent across every report.
   ------------------------------------------------------------------ */

function describePrivacy(band: string): string {
  switch (band) {
    case "Critical":
      return "Highly sensitive content is visible — sanitize before sharing.";
    case "High":
      return "Several sensitive items were detected in this image.";
    case "Moderate":
      return "Some potentially identifying content was detected.";
    default:
      return "Little or no personally identifying content was detected.";
  }
}

function describeForensic(score: number): string {
  if (score >= 61) return "Strong signs of editing or re-compression";
  if (score >= 31) return "Some inconsistencies worth a closer look";
  return "Low";
}

function describeAi(score: number): string {
  if (score >= 61) return "High";
  if (score >= 31) return "Moderate";
  return "Low";
}
