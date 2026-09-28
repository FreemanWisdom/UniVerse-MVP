"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatOrbitTime } from "@/features/orbit/orbit.utils";
import { AdminReport } from "@/features/admin/admin.types";
import { listAdminReports, moderateAdminReport } from "@/services/admin/admin.service";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminLoadingRows,
  AdminPageHeader,
  AdminPill,
} from "@/components/admin/ui";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setReports(await listAdminReports(createClient()));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);

  const act = async (report: AdminReport, action: "dismiss" | "remove") => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await moderateAdminReport(createClient(), report.id, action);
      setMessage(action === "dismiss" ? "Report dismissed." : "Reported content removed.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Reports" description="User-submitted content reports awaiting review." />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}

      {loading ? (
        <AdminLoadingRows rows={3} />
      ) : reports.length === 0 ? (
        <AdminCard>
          <AdminEmptyState title="No open reports" description="User-submitted reports will appear here for review." />
        </AdminCard>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const isPending = report.status === "pending" || report.status === "open";
            return (
              <AdminCard key={report.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminPill tone="warning">{report.reason ?? "unspecified"}</AdminPill>
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {report.content_type ?? "unknown type"}
                      </span>
                      <AdminPill tone={isPending ? "info" : "neutral"}>{report.status ?? "pending"}</AdminPill>
                    </div>
                    {report.content_preview ? (
                      <p className="mt-2 break-words rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        “{report.content_preview}”
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-400">{formatOrbitTime(report.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="flex gap-2">
                      <AdminButton variant="secondary" size="sm" disabled={busy} onClick={() => void act(report, "dismiss")}>
                        Dismiss
                      </AdminButton>
                      {report.content_type === "whisper" ? null : (
                        <AdminButton variant="dangerSoft" size="sm" disabled={busy} onClick={() => void act(report, "remove")}>
                          Remove content
                        </AdminButton>
                      )}
                    </div>
                    {report.content_type === "whisper" ? (
                      <span className="max-w-52 text-right text-[10px] leading-tight text-slate-400">
                        Whisper removal is not supported by the moderation function yet
                      </span>
                    ) : null}
                  </div>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
