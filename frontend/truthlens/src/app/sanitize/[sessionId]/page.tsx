/**
 * `/sanitize/[sessionId]` — the sanitization screen (UC-5).
 *
 * Keyed by SESSION, not report, because that is what the endpoint takes:
 * `POST /api/v1/sanitize/{session_id}`.
 *
 * The report id rides along as `?report=…` so the "Back to report" link has
 * somewhere to go. A query param rather than a second dynamic segment: it is
 * optional context for navigation, not part of the resource's identity.
 */
import type { Metadata } from "next";
import { SanitizeView } from "@/components/sanitize/SanitizeView";

export const metadata: Metadata = { title: "Sanitize image" };

export default async function SanitizePage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ report?: string }>;
}) {
  // Next.js 16: both params and searchParams are Promises.
  const [{ sessionId }, { report }] = await Promise.all([params, searchParams]);

  return <SanitizeView sessionId={sessionId} reportId={report ?? null} />;
}
