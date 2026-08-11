"use client";

/**
 * "Recommendations" — FR-11.2's plain-language guidance.
 *
 * Always open, because this is the part a non-technical user actually acts
 * on. When the privacy risk is Critical it also repeats the sanitize action
 * here, so the recommendation and the way to follow it are in the same place.
 */
import Link from "next/link";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { Accordion } from "@/components/ui/Accordion";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/DataLists";
import { routes } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import type { Recommendation, RecommendationSeverity } from "@/types/report";

const SEVERITY_STYLES: Record<
  RecommendationSeverity,
  { icon: typeof Info; className: string }
> = {
  action: { icon: TriangleAlert, className: "bg-red-bg text-red" },
  info: { icon: Info, className: "bg-blue-tint text-blue" },
  ok: { icon: CheckCircle2, className: "bg-green-bg text-green" },
};

export function RecommendationsSection({
  recommendations,
  sessionId,
  reportId,
  showSanitizeAction,
}: {
  recommendations: Recommendation[];
  sessionId: string;
  reportId: string;
  /** True when the privacy risk warrants repeating the sanitize call to action. */
  showSanitizeAction: boolean;
}) {
  return (
    <Accordion
      icon={<CheckCircle2 className="size-5" />}
      iconClassName="bg-green-bg text-green"
      title="Recommendations"
      summary="What to do next"
      defaultOpen
    >
      {recommendations.length === 0 ? (
        <EmptyState message="No specific actions were recommended for this image." />
      ) : (
        <ul className="m-0 list-none p-0">
          {recommendations.map((recommendation, index) => {
            const { icon: Icon, className } =
              SEVERITY_STYLES[recommendation.severity];
            return (
              <li
                key={index}
                className={cn(
                  "flex items-start gap-3 py-3.5",
                  index < recommendations.length - 1 &&
                    "border-b border-divider",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-[30px] shrink-0 items-center justify-center rounded-btn",
                    className,
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div>{recommendation.text}</div>
              </li>
            );
          })}
        </ul>
      )}

      {showSanitizeAction && (
        <div className="mt-4">
          <Link
            href={routes.sanitize(sessionId, reportId)}
            className={buttonClasses({ variant: "primary" })}
          >
            Sanitize image →
          </Link>
        </div>
      )}
    </Accordion>
  );
}
