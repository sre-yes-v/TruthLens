"use client";

/**
 * The sticky top of the report: the mandatory disclaimer, the action row,
 * and the session/expiry line.
 *
 * The disclaimer is first and is not dismissible. FR-11.5 requires it
 * "prominently at the top of every rendered report", and FR-9.6 forbids
 * presenting the score as a determination — so it sits above the score,
 * inside the sticky region, and stays visible while the user scrolls.
 */
import Link from "next/link";
import { Download, TriangleAlert, Wand2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Card";
import { routes } from "@/lib/constants/routes";
import { formatExpiry, formatRelativeTime, shortId } from "@/lib/utils/formatters";
import { site } from "@/config/site";
import type { Report } from "@/types/report";

export function ReportHeader({
  report,
  onDownloadClick,
}: {
  report: Report;
  onDownloadClick: () => void;
}) {
  const expiry = formatExpiry(report.expires_at);

  return (
    <div className="sticky top-14 z-30 bg-page pt-1.5">
      <div className="mb-4 flex items-center gap-2.5 rounded-card border border-disclaimer-border bg-disclaimer-bg px-[15px] py-[11px] text-[13.5px] text-disclaimer-ink">
        <TriangleAlert aria-hidden="true" className="size-[18px] shrink-0" />
        <span>{site.disclaimer}</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Eyebrow>Forensic report</Eyebrow>
        <span className="flex-1" />

        <button
          type="button"
          onClick={onDownloadClick}
          className={buttonClasses()}
        >
          <Download aria-hidden="true" className="size-4" />
          Download report
        </button>

        {/*
          UC-5's precondition is already satisfied: this button only exists
          on a rendered report, which means UC-4 completed. The backend
          enforces the same rule independently and returns 409 otherwise
          (FR-5.7) — the UI is a convenience, not the gate.
        */}
        <Link
          href={routes.sanitize(report.session_id, report.report_id)}
          className={buttonClasses({ variant: "primary" })}
        >
          <Wand2 aria-hidden="true" className="size-4" />
          Sanitize image
        </Link>
      </div>

      <p className="mb-3.5 text-[12.5px] text-ink-3">
        Analyzed {formatRelativeTime(report.created_at)} · session{" "}
        <span className="font-mono">{shortId(report.session_id, 9)}</span>
        {expiry ? ` · ${expiry}` : ""}
      </p>
    </div>
  );
}
