"use client";

/**
 * The "Analysis couldn't be completed" screen.
 *
 * Rendered in place on `/analyze/[sessionId]` rather than at its own route.
 * A failed pipeline is the outcome of *this session*, so it belongs to this
 * URL: refreshing re-attempts the same session, and there is no way to land
 * on a failure screen with no session behind it.
 *
 * The session id and error code are shown verbatim. SRS §9.4 requires the
 * session id on every error precisely so it can be quoted in a support
 * request and matched against the backend logs (NFR-2.2).
 */
import Link from "next/link";
import { X } from "lucide-react";
import { StateScreen } from "@/components/layout/PageContainer";
import { buttonClasses } from "@/components/ui/Button";
import { routes } from "@/lib/constants/routes";
import { shortId } from "@/lib/utils/formatters";
import type { NormalizedApiError } from "@/types/errors";

export function AnalysisFailed({
  sessionId,
  error,
}: {
  sessionId: string;
  error: NormalizedApiError;
}) {
  return (
    <StateScreen
      tone="error"
      icon={<X className="size-[30px]" />}
      title="Analysis couldn't be completed"
      code={`session ${shortId(sessionId, 9)} · error: ${error.error_code}`}
      actions={
        <Link
          href={routes.home()}
          className={buttonClasses({ variant: "primary" })}
        >
          Try another image
        </Link>
      }
    >
      {error.message}
    </StateScreen>
  );
}
