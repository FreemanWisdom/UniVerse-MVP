"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminSystemHealth } from "@/features/admin/admin.types";
import { getAdminSystemHealth } from "@/services/admin/admin.service";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminPageHeader,
  AdminPill,
} from "@/components/admin/ui";
import { cn } from "@/lib/utils/cn";

type ServiceKey = "database" | "auth" | "realtime" | "storage" | "rpc";

const SERVICE_LABELS: Record<ServiceKey, string> = {
  database: "Database",
  auth: "Authentication",
  realtime: "Realtime",
  storage: "Storage",
  rpc: "RPC layer",
};

/**
 * Each service shows the state returned by admin_get_system_health. Only
 * "online" / "error" are real probe results; "configured" means the signal is
 * not actively probed — it is labeled honestly, never shown as healthy.
 */
export default function AdminSystemHealthPage() {
  const [health, setHealth] = useState<AdminSystemHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      setHealth(await getAdminSystemHealth(createClient()));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to run health check.");
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
        title="System Health"
        description="Operational status of core platform services."
        actions={
          <AdminButton variant="secondary" size="sm" disabled={busy} onClick={() => void load()}>
            {busy ? "Checking…" : "Run health check"}
          </AdminButton>
        }
      />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}

      {health ? (
        <>
          <AdminCard>
            <AdminCardHeader
              title="Service status"
              description={`Last checked ${new Date(health.checked_at).toLocaleString()}`}
            />
            <div className="divide-y divide-slate-100">
              {(["database", "auth", "realtime", "storage", "rpc"] as ServiceKey[]).map((key) => {
                const state = health[key];
                const probed = state === "online" || state === "error";
                return (
                  <div key={key} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{SERVICE_LABELS[key]}</p>
                      <p className="text-xs text-slate-500">
                        {probed
                          ? "Actively probed by the health check"
                          : "Configured but not actively probed — status unavailable"}
                      </p>
                    </div>
                    <AdminPill
                      tone={state === "online" ? "success" : state === "error" ? "danger" : "neutral"}
                      className={cn(!probed && "opacity-70")}
                    >
                      {probed ? state : "unprobed"}
                    </AdminPill>
                  </div>
                );
              })}
            </div>
          </AdminCard>

          <AdminCard className="px-5 py-4">
            <p className="text-sm text-slate-700">
              Platform activity events (last 24h):{" "}
              <span className="font-semibold text-slate-900">{health.activity_events_24h}</span>
            </p>
          </AdminCard>

          <AdminAlert tone="neutral">
            Messaging delivery, push notifications, and background jobs do not emit health signals
            yet. They will appear here once the platform reports them — no status is estimated.
          </AdminAlert>
        </>
      ) : !error ? (
        <AdminCard>
          <p className="px-5 py-8 text-center text-sm text-slate-500">Running health check…</p>
        </AdminCard>
      ) : null}
    </div>
  );
}
