"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatOrbitTime } from "@/features/orbit/orbit.utils";
import { AdminReport } from "@/features/admin/admin.types";
import { listAdminReports, moderateAdminReport } from "@/services/admin/admin.service";

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
      setMessage(`${action} applied to report.`);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports</h1>
        <p className="text-sm text-slate-400">User-submitted content reports awaiting review.</p>
      </div>

      {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}
      {message ? <p className="text-sm text-campus-400" role="status">{message}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-400" aria-live="polite">Loading reports…</p>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-400">No reports — the campus is calm.</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="space-y-2 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-200">
                      <span className="font-semibold text-amber-400">{report.reason ?? "unspecified"}</span>
                      {" · "}
                      {report.content_type ?? "unknown type"}
                      {" · "}
                      <span
                        className={
                          report.status === "pending" || report.status === "open"
                            ? "text-amber-400"
                            : "text-slate-500"
                        }
                      >
                        {report.status ?? "pending"}
                      </span>
                    </p>
                    {report.content_preview ? (
                      <p className="mt-1 break-words text-xs text-slate-400">“{report.content_preview}”</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-slate-500">{formatOrbitTime(report.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void act(report, "dismiss")}
                      className="rounded-lg border border-surface-300 bg-surface-100 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-campus-500 disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void act(report, "remove")}
                      className="rounded-lg border border-red-500/50 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:border-red-500 disabled:opacity-50"
                    >
                      Remove content
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
