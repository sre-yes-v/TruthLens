"use client";

/**
 * The admin monitoring screen (UC-7).
 *
 * WHAT IS REAL AND WHAT IS NOT
 * The prototype includes this screen, so it is built. But the SRS defines no
 * admin API endpoint, so `api.getAdminOverview()` only returns data in mock
 * mode; the real implementation throws `not_implemented`. That failure is
 * shown to the user as an explanation, not as a crash — and no fake numbers
 * are ever rendered against a real backend.
 *
 * When the backend adds the endpoint, replace the body of
 * `services.ts#getAdminOverview` and this screen starts working. Nothing
 * here changes.
 */
import { useEffect, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Card, Eyebrow, FieldLabel } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Progress";
import { FindingList } from "@/components/ui/DataLists";
import { PageContainer } from "@/components/layout/PageContainer";
import { api } from "@/lib/api";
import { describeError, normalizeError } from "@/lib/utils/errors";
import { formatClockTime, formatRelativeTime } from "@/lib/utils/formatters";
import type { AdminOverview } from "@/types/admin";
import type { NormalizedApiError } from "@/types/errors";

export function AdminView() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<NormalizedApiError | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    api
      .getAdminOverview(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setOverview(data);
        setLoading(false);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setError(normalizeError(caught));
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <PageContainer width="wide">
      <Eyebrow>Internal · Admin</Eyebrow>
      <h1 className="mt-1 text-xl font-bold tracking-[-0.3px]">
        System health &amp; logs
      </h1>

      {loading && (
        <div className="flex flex-col items-center gap-3.5 py-16">
          <Spinner label="Loading system status" />
          <p className="text-ink-2">Loading system status…</p>
        </div>
      )}

      {!loading && error && (
        <Banner tone="info" className="mt-5" title={`${describeError(error).title}.`}>
          {describeError(error).body}
        </Banner>
      )}

      {!loading && overview && (
        <>
          <p className="mt-1.5 mb-5 flex items-center gap-1.5 text-[13px] text-ink-2">
            <span
              aria-hidden="true"
              className={
                "inline-block size-2.5 rounded-full " +
                (overview.health.all_engines_operational ? "bg-green" : "bg-red")
              }
            />
            {overview.health.all_engines_operational
              ? "All engines operational"
              : "One or more engines are degraded"}{" "}
            · updated {formatRelativeTime(overview.health.updated_at)}
          </p>

          {/* Four stats. One column on phones, two from `sm`, four from `lg`
              — the prototype's 2-up grid, extended so a wide screen doesn't
              leave half the row empty. */}
          <div className="mb-3.5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Active sessions"
              value={String(overview.stats.active_sessions)}
              suffix={`/ ${overview.stats.session_capacity} capacity`}
            />
            <Stat
              label="Avg pipeline time"
              value={`${overview.stats.avg_pipeline_seconds}s`}
            />
            <Stat
              label="Completion rate (24h)"
              value={`${overview.stats.completion_rate_24h}%`}
            />
            <Stat
              label="Images in retention"
              value={String(overview.stats.images_in_retention)}
            />
          </div>

          <Card padded className="mb-3.5">
            <FieldLabel>Recent engine failures</FieldLabel>
            {overview.recent_failures.length === 0 ? (
              <p className="text-sm text-ink-2">
                No engine failures in the last 24 hours.
              </p>
            ) : (
              <FindingList
                items={overview.recent_failures.map((failure) => ({
                  tag: failure.engine,
                  tone: failure.recovered ? "low" : "moderate",
                  text: `${failure.message} · session ${failure.session_id} · ${formatClockTime(failure.timestamp)}`,
                }))}
              />
            )}
          </Card>

          <Card padded>
            <FieldLabel>Audit log</FieldLabel>
            <AuditLogTable entries={overview.audit_log} />
          </Card>
        </>
      )}
    </PageContainer>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <Card padded>
      <div className="text-[13px] text-ink-2">{label}</div>
      <div className="text-[30px] font-bold tracking-[-0.5px]">
        {value}
        {suffix && (
          <span className="ml-1 text-[13px] font-normal text-ink-2">
            {suffix}
          </span>
        )}
      </div>
    </Card>
  );
}

/**
 * The audit log. Wrapped in a horizontally scrollable container so a narrow
 * screen scrolls the table rather than squeezing four columns into 320px or
 * forcing the whole page to scroll sideways.
 */
function AuditLogTable({
  entries,
}: {
  entries: AdminOverview["audit_log"];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {["Session", "Stage", "Event", "Time"].map((heading) => (
              <th
                key={heading}
                scope="col"
                className="border-b border-divider-2 px-2.5 py-2 text-left font-semibold text-ink-3"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono">
          {entries.map((entry, index) => (
            <tr key={index}>
              <td className="border-b border-dashed border-divider-2 px-2.5 py-2 text-ink-2">
                {entry.session_id}
              </td>
              <td className="border-b border-dashed border-divider-2 px-2.5 py-2 text-ink-2">
                {entry.stage}
              </td>
              <td
                className={
                  "border-b border-dashed border-divider-2 px-2.5 py-2 " +
                  eventClass(entry.event_type)
                }
              >
                {entry.event_type}
              </td>
              <td className="border-b border-dashed border-divider-2 px-2.5 py-2 text-ink-2">
                {formatClockTime(entry.timestamp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Failures red, completions green, everything else neutral. */
function eventClass(eventType: string): string {
  if (eventType.includes("failed")) return "font-semibold text-red";
  if (eventType.includes("ready") || eventType.includes("done"))
    return "font-semibold text-green";
  return "text-ink-2";
}
