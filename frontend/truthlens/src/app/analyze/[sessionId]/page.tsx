/**
 * `/analyze/[sessionId]` — the live analysis screen.
 *
 * A thin Server Component. Its only job is to unwrap the route parameter
 * and hand it to the client component that does the work.
 *
 * Note the `await params`: in Next.js 16 route params are a Promise
 * (the "async request APIs" breaking change). Reading them synchronously,
 * as Next 14 allowed, no longer compiles.
 */
import type { Metadata } from "next";
import { AnalysisView } from "@/components/analysis/AnalysisView";

export const metadata: Metadata = { title: "Analyzing image" };

export default async function AnalyzePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <AnalysisView sessionId={sessionId} />;
}
