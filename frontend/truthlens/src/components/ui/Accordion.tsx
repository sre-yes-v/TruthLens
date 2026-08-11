"use client";

/**
 * The prototype's `.acc` — a collapsible report section.
 *
 * Built from a real <button> that toggles `aria-expanded` and points at the
 * panel it controls via `aria-controls`. That is what makes the report
 * navigable by keyboard and announceable by a screen reader; the prototype's
 * `onclick="this.parentNode.classList.toggle('open')"` gives neither.
 *
 * Open state is local to each section: the report has seven of them and they
 * open independently, so there is nothing for a parent to coordinate.
 */
import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface AccordionProps {
  /** Icon shown in the rounded tile at the left of the header. */
  icon: ReactNode;
  title: string;
  /** One-line result, visible while collapsed. */
  summary: string;
  /** Optional status pill on the right of the header. */
  badge?: ReactNode;
  defaultOpen?: boolean;
  /** Overrides the icon tile's colours, e.g. green for Recommendations. */
  iconClassName?: string;
  children: ReactNode;
}

export function Accordion({
  icon,
  title,
  summary,
  badge,
  defaultOpen = false,
  iconClassName,
  children,
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const headerId = useId();

  return (
    <section className="overflow-hidden rounded-card bg-card shadow-card">
      <h2>
        <button
          type="button"
          id={headerId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-3.5 px-[18px] py-4 text-left hover:bg-[#FAFBFC]"
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-card bg-blue-tint text-blue",
              iconClassName,
            )}
          >
            {icon}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{title}</span>
            <span className="block truncate text-[13px] text-ink-2">
              {summary}
            </span>
          </span>

          {badge}

          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-[18px] shrink-0 text-ink-3 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </h2>

      {/* Unmounted rather than hidden when closed: the report renders images
          and long lists, and keeping seven collapsed panels in the DOM costs
          more than it saves. */}
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="animate-fade-in border-t border-divider-2 px-[18px] pb-5"
        >
          <div className="pt-4">{children}</div>
        </div>
      )}
    </section>
  );
}

/**
 * The two-column grid the prototype uses inside report sections
 * (`.cols`). Collapses to one column below 640px.
 */
export function SectionColumns({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}
