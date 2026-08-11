/**
 * `/report/[reportId]` — the forensic report.
 *
 * Deep-linkable and shareable: the report outlives the analysis session, so
 * it gets its own URL keyed by report id rather than living as a state of
 * the analysis screen.
 */
import type { Metadata } from "next";
import { ReportView } from "@/components/report/ReportView";

export const metadata: Metadata = { title: "Forensic report" };

export default async function ReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  // Next.js 16: route params are a Promise.
  const { reportId } = await params;
  return <ReportView reportId={reportId} />;
}
