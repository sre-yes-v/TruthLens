"use client";

/**
 * The prototype's "Prototype map" — a floating panel that jumps to any UI
 * state, so a reviewer can inspect every screen without reproducing the
 * conditions that lead to it.
 *
 * The prototype's own HTML labels this a "Reviewer aid — not part of the
 * product UI", so it is OFF by default and gated behind
 * NEXT_PUBLIC_ENABLE_PROTOTYPE_TOOLS=true. It returns null in production
 * builds unless that flag is explicitly set, which means it cannot ship to
 * users by accident.
 *
 * It links to real routes with real ids — it does not fake UI states — so
 * what a reviewer sees is the actual application, not a mockup of it.
 */
import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, X } from "lucide-react";
import { env } from "@/config/env";
import { routes } from "@/lib/constants/routes";
import { MOCK_CASES } from "@/mocks/reports";
import { MOCK_FAILING_SESSION_PREFIX } from "@/mocks/mockStream";

interface MapLink {
  label: string;
  href: string;
}

interface MapSection {
  heading: string;
  links: MapLink[];
}

function buildSections(): MapSection[] {
  const [street, hill, portrait, scan] = MOCK_CASES;

  return [
    {
      heading: "Upload",
      links: [{ label: "Landing · empty state", href: routes.home() }],
    },
    {
      heading: "Analysis",
      links: [
        {
          label: "Analyzing · live progress",
          href: routes.analyze(street.report.session_id),
        },
        {
          label: "Analyzing · engine degraded",
          href: routes.analyze(scan.report.session_id),
        },
        {
          label: "Analysis failed (total)",
          href: routes.analyze(`${MOCK_FAILING_SESSION_PREFIX}f9a2-71bd`),
        },
      ],
    },
    {
      heading: "Report",
      links: [
        {
          label: "Report · likely authentic / safe",
          href: routes.report(hill.report.report_id),
        },
        {
          label: "Report · privacy alert (Critical)",
          href: routes.report(street.report.report_id),
        },
        {
          label: "Report · likely AI-generated",
          href: routes.report(portrait.report.report_id),
        },
        {
          label: "Report · with degraded engine",
          href: routes.report(scan.report.report_id),
        },
      ],
    },
    {
      heading: "Sanitize & download",
      links: [
        {
          label: "Sanitize · before/after",
          href: routes.sanitize(
            street.report.session_id,
            street.report.report_id,
          ),
        },
        {
          label: "Sanitize · nothing to blur",
          href: routes.sanitize(hill.report.session_id, hill.report.report_id),
        },
      ],
    },
    {
      heading: "Edge & other",
      links: [
        { label: "Report expired (24h)", href: routes.expired() },
        {
          label: "Report not found (404)",
          href: routes.report("rep-does-not-exist"),
        },
        {
          label: "Sanitize before report (409)",
          href: routes.sanitize("unknown-session"),
        },
        { label: "Admin · health & logs", href: routes.admin() },
      ],
    },
  ];
}

export function PrototypeMap() {
  const [open, setOpen] = useState(false);

  if (!env.enablePrototypeTools) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="fixed right-5 bottom-5 z-70 flex items-center gap-2 rounded-full bg-ink px-4 py-[11px] text-[13px] font-semibold text-white shadow-lift"
      >
        {open ? (
          <X aria-hidden="true" className="size-3.5" />
        ) : (
          <LayoutGrid aria-hidden="true" className="size-3.5" />
        )}
        Prototype map
      </button>

      {open && (
        <div className="fixed right-5 bottom-[72px] z-70 max-h-[70vh] w-[290px] overflow-auto rounded-modal bg-card shadow-lift">
          <h2 className="px-[18px] pt-[15px] pb-1.5 text-xs font-normal tracking-[0.5px] text-ink-3 uppercase">
            Jump to any state
          </h2>
          <p className="px-[18px] pb-2 text-xs text-ink-3">
            Reviewer aid — not part of the product UI.
          </p>

          {buildSections().map((section) => (
            <div key={section.heading}>
              <div className="border-t border-divider-2 px-[18px] pt-3 pb-1 text-[11px] font-bold tracking-[0.5px] text-ink-3 uppercase">
                {section.heading}
              </div>
              {section.links.map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block border-t border-divider-2 px-[18px] py-[9px] text-[13px] text-ink hover:bg-blue-wash hover:text-blue"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
