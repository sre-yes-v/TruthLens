/**
 * `/expired` — the report-retention screen.
 *
 * Reached two ways: the report page redirects here on a 404/410, and it is
 * a real destination in its own right for a bookmarked report that has
 * since been deleted.
 *
 * This is not framed as an error, because it isn't one. NFR-4.1 deletes
 * originals after the retention window *by design*, and §11 treats minimal
 * retention as a feature. The copy says so.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Clock } from "lucide-react";
import { StateScreen } from "@/components/layout/PageContainer";
import { buttonClasses } from "@/components/ui/Button";
import { routes } from "@/lib/constants/routes";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Report expired" };

export default function ExpiredPage() {
  return (
    <StateScreen
      tone="neutral"
      icon={<Clock className="size-[30px]" />}
      title="This report has expired"
      code="retention_expired"
      actions={
        <Link
          href={routes.home()}
          className={buttonClasses({ variant: "primary" })}
        >
          Analyze an image
        </Link>
      }
    >
      Reports and their images are kept for {site.retentionHours} hours, then
      permanently deleted for privacy. This one is no longer available.
    </StateScreen>
  );
}
