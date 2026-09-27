"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatOrbitTime } from "@/features/orbit/orbit.utils";
import { AdminOverview } from "@/features/admin/admin.types";
import { getAdminOverview } from "@/services/admin/admin.service";
import {
  AdminAlert,
  AdminCard,
  AdminEmptyState,
  AdminLoadingRows,
  AdminPageHeader,
  AdminPill,
  AdminStatCard,
  AdminTD,
  AdminTH,
  AdminTableWrap,
} from "@/components/admin/ui";
import {
  IconActivity,
  IconAlertTriangle,
  IconCheckCircle,
  IconDatabase,
  IconFlag,
  IconRefresh,
  IconSchool,
  IconUsers,
} from "@/components/admin/icons";

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
      <AdminPageHeader
        title="Overview"
        description="Live platform metrics across all campuses."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <IconRefresh size={14} className={busy ? "animate-spin" : undefined} />
            {busy ? "Refreshing" : "Refresh"}
          </button>
        }
      />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}

      {!overview && !error ? (
        <AdminLoadingRows rows={3} />
      ) : overview ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <AdminStatCard label="Total users" value={overview.total_users} icon={<IconUsers size={16} />} />
            <AdminStatCard label="Verified" value={overview.verified_users} tone="positive" icon={<IconCheckCircle size={16} />} />
            <AdminStatCard label="Active 24h" value={overview.active_today} icon={<IconActivity size={16} />} />
            <AdminStatCard label="Open reports" value={overview.pending_reports} tone={overview.pending_reports > 0 ? "warning" : "default"} icon={<IconFlag size={16} />} />
            <AdminStatCard label="Campuses" value={overview.campuses} icon={<IconSchool size={16} />} />
            <AdminStatCard label="Sessions" value={overview.active_sessions} icon={<IconDatabase size={16} />} />
          </div>

          {overview.attention && overview.attention.length > 0 ? (
            <AdminAlert tone="warning">
              <div className="space-y-1">
                {overview.attention.map((item, index) => (
                  <p key={index}>
                    <span className="font-medium">{item.title}</span> — {item.detail}
                  </p>
                ))}
              </div>
            </AdminAlert>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Content</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {Object.entries(overview.pulse).map(([label, count]) => (
                <AdminCard key={label} className="px-4 py-3">
                  <p className="text-xs capitalize text-slate-500">{label.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{count}</p>
                </AdminCard>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Campuses</h2>
            <AdminTableWrap>
              <thead>
                <tr>
                  <AdminTH>University</AdminTH>
                  <AdminTH>Registered</AdminTH>
                  <AdminTH>Verified</AdminTH>
                  <AdminTH>Active 24h</AdminTH>
                </tr>
              </thead>
              <tbody>
                {overview.universities.map((row) => (
                  <tr key={row.university} className="transition-colors hover:bg-slate-50/60">
                    <AdminTD className="font-medium text-slate-900">{row.university}</AdminTD>
                    <AdminTD>{row.registered_users}</AdminTD>
                    <AdminTD>{row.verified_users}</AdminTD>
                    <AdminTD>{row.active_24h}</AdminTD>
                  </tr>
                ))}
              </tbody>
            </AdminTableWrap>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
            <AdminCard className="divide-y divide-slate-100">
              {overview.recent_activity.length === 0 ? (
                <AdminEmptyState
                  title="No recorded activity yet"
                  description="Platform events will appear here as admins and students take action."
                />
              ) : (
                overview.recent_activity.slice(0, 40).map((item) => (
                  <div key={String(item.id)} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        {item.result === "success" ? <IconCheckCircle size={13} /> : <IconAlertTriangle size={13} />}
                      </span>
                      <p className="min-w-0 truncate text-sm text-slate-700">
                        <span className="font-medium text-slate-900">{item.actor_name ?? "System"}</span>{" "}
                        {item.action}
                        {item.entity_type ? <span className="text-slate-400"> · {item.entity_type}</span> : null}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{formatOrbitTime(item.created_at)}</span>
                  </div>
                ))
              )}
            </AdminCard>
          </section>
        </>
      ) : null}
    </div>
  );
}
