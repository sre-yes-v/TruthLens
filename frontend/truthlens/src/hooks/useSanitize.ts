"use client";

/**
 * Runs sanitization for a session (UC-5).
 *
 * Two things worth knowing:
 *
 * 1. Sanitization is a POST — it creates a new artifact. It therefore runs
 *    once, on mount, and is guarded by a ref so React's development-mode
 *    double-invocation of effects doesn't fire it twice.
 *
 * 2. It needs the report's privacy detections to draw the before/after
 *    boxes, because FR-5.3–5.5 blur exactly the regions the privacy engine
 *    found in UC-2. So the hook takes an optional report and passes its
 *    detections to the mapper.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { toSanitizeResult } from "@/lib/api/mappers";
import { normalizeError } from "@/lib/utils/errors";
import { CLIENT_ERROR_CODES } from "@/types/api";
import type { NormalizedApiError } from "@/types/errors";
import type { DetectedObject } from "@/types/report";
import type { SanitizeResult } from "@/types/sanitize";

export interface UseSanitizeResult {
  result: SanitizeResult | null;
  loading: boolean;
  error: NormalizedApiError | null;
  /** Re-runs sanitization, for the "Try again" button on a failure. */
  retry: () => void;
}

export function useSanitize(
  sessionId: string,
  detectedObjects: DetectedObject[] | undefined,
  /** Wait until the report has loaded, so the detections are available. */
  ready: boolean,
): UseSanitizeResult {
  const [result, setResult] = useState<SanitizeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<NormalizedApiError | null>(null);

  const hasRun = useRef(false);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.sanitizeImage(sessionId);
      setResult(toSanitizeResult(response, detectedObjects ?? []));
    } catch (caught) {
      const normalized = normalizeError(caught);
      if (normalized.error_code !== CLIENT_ERROR_CODES.ABORTED) {
        setError(normalized);
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, detectedObjects]);

  useEffect(() => {
    if (!ready || hasRun.current) return;
    hasRun.current = true;
    void run();
  }, [ready, run]);

  const retry = useCallback(() => {
    hasRun.current = true;
    void run();
  }, [run]);

  return { result, loading, error, retry };
}
