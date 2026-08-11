"use client";

/**
 * Fetches one report by id.
 *
 * A small hook rather than a data-fetching library. The report is read once
 * per route, never refetched, never mutated, and shared with nothing — the
 * caching, deduplication and invalidation that React Query exists to provide
 * would all be unused machinery here.
 *
 * Two details worth understanding:
 *
 * • `loading` is DERIVED, not stored. We record which id the current result
 *   belongs to, and "loading" simply means "the settled result isn't for the
 *   id I was asked about". That removes a whole class of bug where a stale
 *   response flips `loading` off for the wrong request.
 *
 * • `AbortController` cancels the request if the user navigates away, so we
 *   never set state on an unmounted component.
 */
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { normalizeError } from "@/lib/utils/errors";
import { CLIENT_ERROR_CODES } from "@/types/api";
import type { NormalizedApiError } from "@/types/errors";
import type { Report } from "@/types/report";

export interface UseReportResult {
  report: Report | null;
  loading: boolean;
  error: NormalizedApiError | null;
}

/** What a finished request produced, and which id it was for. */
interface SettledResult {
  forId: string;
  report: Report | null;
  error: NormalizedApiError | null;
}

/**
 * @param reportId - pass `null` to skip fetching. The sanitize screen uses
 *   this: it wants the report's privacy detections when it knows the report
 *   id, and works without them when it doesn't.
 */
export function useReport(reportId: string | null): UseReportResult {
  const [settled, setSettled] = useState<SettledResult | null>(null);

  useEffect(() => {
    if (reportId === null) return;

    const controller = new AbortController();

    api
      .getReport(reportId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setSettled({ forId: reportId, report: result, error: null });
      })
      .catch((caught: unknown) => {
        const normalized = normalizeError(caught);
        // An aborted request means we navigated away — not a failure to show.
        if (normalized.error_code === CLIENT_ERROR_CODES.ABORTED) return;
        if (controller.signal.aborted) return;
        setSettled({ forId: reportId, report: null, error: normalized });
      });

    return () => controller.abort();
  }, [reportId]);

  if (reportId === null) {
    return { report: null, loading: false, error: null };
  }

  const isCurrent = settled?.forId === reportId;
  return {
    report: isCurrent ? settled.report : null,
    error: isCurrent ? settled.error : null,
    loading: !isCurrent,
  };
}
