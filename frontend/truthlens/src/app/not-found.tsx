/**
 * 404 — an unknown URL.
 *
 * Distinct from `/expired`: that page means "this report existed and was
 * deleted on schedule", this one means "there was never anything here".
 * Collapsing the two would tell a user their report expired when they
 * simply mistyped a link.
 */
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { StateScreen } from "@/components/layout/PageContainer";
import { buttonClasses } from "@/components/ui/Button";
import { routes } from "@/lib/constants/routes";

export default function NotFound() {
  return (
    <StateScreen
      tone="neutral"
      icon={<FileQuestion className="size-[30px]" />}
      title="Page not found"
      actions={
        <Link
          href={routes.home()}
          className={buttonClasses({ variant: "primary" })}
        >
          Go to TruthLens
        </Link>
      }
    >
      That link doesn&apos;t point to anything in TruthLens. It may have been
      mistyped.
    </StateScreen>
  );
}
