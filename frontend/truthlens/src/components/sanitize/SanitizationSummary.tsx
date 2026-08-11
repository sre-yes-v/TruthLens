/**
 * "What was changed" — FR-5.6's Sanitization Summary.
 *
 * The requirement is specific: list *each modification applied*, by category
 * and count. That transparency is the point of the feature — a user handing
 * out a sanitized image should be able to see exactly what was removed and
 * what was not.
 */
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { SanitizationSummaryItem } from "@/types/api";

export function SanitizationSummary({
  items,
}: {
  items: SanitizationSummaryItem[];
}) {
  return (
    <ul className="m-0 list-none p-0">
      {items.map((item, index) => (
        <li
          key={`${item.category}-${index}`}
          className={cn(
            "flex items-center gap-2.5 py-[11px] text-sm",
            index < items.length - 1 && "border-b border-dashed border-divider-2",
          )}
        >
          <span
            aria-hidden="true"
            className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-green-bg text-green"
          >
            <Check className="size-3.5" />
          </span>
          {item.description}
        </li>
      ))}
    </ul>
  );
}
