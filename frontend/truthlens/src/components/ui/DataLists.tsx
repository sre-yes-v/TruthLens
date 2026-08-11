/**
 * The three list shapes the report uses over and over:
 *   • KeyValueList — the prototype's `.kvlist` (label on the left, value right)
 *   • FindingList  — the prototype's `ul.findings` (tag chip + text)
 *   • EmptyState   — the prototype's `.empty`
 *
 * They exist as components because the report repeats them in six sections.
 * Written inline they would be six copies of the same dashed-divider markup,
 * and a spacing tweak would be a six-file edit.
 */
import type { ReactNode } from "react";
import { CircleMinus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Tag, type BadgeTone } from "./Badge";

/* ---------------------------------------------------------------- */

export interface KeyValueItem {
  label: string;
  value: ReactNode;
}

/**
 * A definition list — semantically correct for label/value pairs, and it
 * tells a screen reader that "Camera" and "Canon EOS 200D" belong together.
 */
export function KeyValueList({ items }: { items: KeyValueItem[] }) {
  return (
    <dl className="text-sm">
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className={cn(
            "flex justify-between gap-3.5 py-[7px]",
            index < items.length - 1 && "border-b border-dashed border-divider-2",
          )}
        >
          <dt className="text-ink-2">{item.label}</dt>
          <dd className="text-right font-semibold">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------------------------------------------------------------- */

export interface FindingItem {
  /** Text of the category chip, e.g. "phone", "obj", "privacy". */
  tag: string;
  tone?: BadgeTone;
  text: ReactNode;
  /** Optional right-aligned detail, e.g. a confidence value. */
  trailing?: ReactNode;
}

export function FindingList({ items }: { items: FindingItem[] }) {
  return (
    <ul className="m-0 list-none p-0">
      {items.map((item, index) => (
        <li
          key={index}
          className={cn(
            "flex items-start gap-2.5 py-[9px] text-sm",
            index < items.length - 1 && "border-b border-dashed border-divider-2",
          )}
        >
          <Tag tone={item.tone}>{item.tag}</Tag>
          <span className="flex-1">{item.text}</span>
          {item.trailing && (
            <span className="ml-auto text-[13px] text-ink-2">
              {item.trailing}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- */

/**
 * Shown when an engine ran successfully and found nothing.
 *
 * Distinct from `DegradedNotice`: "we looked and found no faces" and "the
 * face detector didn't run" are different forensic statements, and the
 * report must not blur them together.
 */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-6 py-[26px] text-center text-ink-3">
      <CircleMinus
        aria-hidden="true"
        className="mx-auto mb-2 size-10 stroke-[1.6] text-[#C9CDD3]"
      />
      {message}
    </div>
  );
}
