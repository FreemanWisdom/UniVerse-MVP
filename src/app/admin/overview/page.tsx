"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatOrbitTime } from "@/features/orbit/orbit.utils";
import { AdminOverview } from "@/features/admin/admin.types";
import { getAdminOverview } from "@/services/admin/admin.service";

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-surface-200 bg-surface-100/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      setOverview(await getAdminOverview(createClient()));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load overview.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Overview</h1>
          <p className="text-sm text-slate-400">Live platform metrics, straight from the admin RPCs.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={busy}
          className="rounded-lg border border-surface-300 bg-surface-100 px-3 py-1.5 text-xs text-slate-300 hover:border-campus-500 disabled:opacity-50"
        >
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}

      {!overview && !error ? (
        <p className="text-sm text-slate-400" aria-live="polite">Loading overview…</p>
      ) : overview ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Total users" value={overview.total_users} />
            <StatTile label="Verified" value={overview.verified_users} />
            <StatTile label="Active 24h" value={overview.active_today} />
            <StatTile label="Pending reports" value={overview.pending_reports} />
            <StatTile label="Campuses" value={overview.campuses} />
            <StatTile label="Active sessions" value={overview.active_sessions} />
          </div>

          {overview.attention && overview.attention.length > 0 ? (
            <Card>
              <CardContent className="space-y-1 p-4">
                {overview.attention.map((item, index) => (
                  <p key={index} className="text-sm text-amber-400">
                    {item.title}: {item.detail}
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">Content pulse</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {Object.entries(overview.pulse).map(([label, count]) => (
                <div key={label} className="rounded-lg border border-surface-200 bg-surface-50 p-3">
                  <p className="text-[11px] text-slate-500">{label}</p>
                  <p className="text-lg font-semibold text-foreground">{count}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">Universities</h2>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-surface-200 text-xs text-slate-500">
                        <th className="p-3">University</th>
                        <th className="p-3">Registered</th>
                        <th className="p-3">Verified</th>
                        <th className="p-3">Active 24h</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.universities.map((row) => (
                        <tr key={row.university} className="border-b border-surface-200/60">
                          <td className="p-3 text-slate-200">{row.university}</td>
                          <td className="p-3 text-slate-300">{row.registered_users}</td>
                          <td className="p-3 text-slate-300">{row.verified_users}</td>
                          <td className="p-3 text-slate-300">{row.active_24h}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">Recent site activity</h2>
            <Card>
              <CardContent className="max-h-96 space-y-2 overflow-y-auto p-4">
                {overview.recent_activity.length === 0 ? (
                  <p className="text-sm text-slate-400">No recorded activity yet.</p>
                ) : (
                  overview.recent_activity.slice(0, 40).map((item) => (
                    <div key={String(item.id)} className="flex items-baseline justify-between gap-3 border-b border-surface-200/50 pb-2 text-sm last:border-0">
                      <span className="min-w-0 flex-1 truncate text-slate-300">
                        <span className="text-slate-400">{item.actor_name ?? "System"}</span>{" "}
                        {item.action} {item.entity_type ? `· ${item.entity_type}` : ""}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-500">{formatOrbitTime(item.created_at)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
