"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatOrbitTime } from "@/features/orbit/orbit.utils";
import {
  AdminAuditEntry,
  AdminEmergencyState,
  AdminFeatureFlag,
  AdminSystemHealth,
} from "@/features/admin/admin.types";
import {
  getAdminAuditLog,
  getAdminEmergencyState,
  getAdminFeatureFlags,
  getAdminSystemHealth,
  publishAdminAnnouncement,
  setAdminFeatureFlag,
  setEmergencyLockdown,
} from "@/services/admin/admin.service";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminInput,
  AdminLoadingRows,
  AdminPageHeader,
  AdminPill,
  AdminTextarea,
} from "@/components/admin/ui";
import { cn } from "@/lib/utils/cn";

function Toggle({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50",
        checked ? "bg-blue-600" : "bg-slate-200"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState<AdminFeatureFlag[]>([]);
  const [emergency, setEmergency] = useState<AdminEmergencyState | null>(null);
  const [health, setHealth] = useState<AdminSystemHealth | null>(null);
  const [audit, setAudit] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [lockdownReason, setLockdownReason] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const [flagRows, emergencyState, healthState, auditRows] = await Promise.all([
        getAdminFeatureFlags(supabase),
        getAdminEmergencyState(supabase),
        getAdminSystemHealth(supabase),
        getAdminAuditLog(supabase, 30),
      ]);
      setFlags(flagRows);
      setEmergency(emergencyState);
      setHealth(healthState);
      setAudit(auditRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);

  const friendly = (code: string, fallback: string) =>
    code === "super_admin_required" ? "Only a super admin can do that." : fallback;

  const toggleFlag = async (flag: AdminFeatureFlag, enabled: boolean) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await setAdminFeatureFlag(createClient(), flag.key, enabled);
      setFlags((current) => current.map((item) => (item.key === flag.key ? { ...item, enabled } : item)));
      setMessage(`Feature “${flag.name}” ${enabled ? "enabled" : "disabled"}.`);
    } catch (flagError) {
      setError(
        friendly(
          flagError instanceof Error ? flagError.message : "",
          flagError instanceof Error ? flagError.message : "Could not update the flag."
        )
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleLockdown = async (enabled: boolean) => {
    if (enabled && !window.confirm("Enable platform-wide lockdown? This disables every feature flag.")) return;
    if (!enabled && !window.confirm("Disable lockdown and re-enable every feature flag?")) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await setEmergencyLockdown(createClient(), enabled, lockdownReason.trim() || undefined);
      setMessage(enabled ? "Lockdown enabled." : "Lockdown disabled.");
      setLockdownReason("");
      await load();
    } catch (lockdownError) {
      setError(
        friendly(
          lockdownError instanceof Error ? lockdownError.message : "",
          lockdownError instanceof Error ? lockdownError.message : "Could not change lockdown."
        )
      );
    } finally {
      setBusy(false);
    }
  };

  const publishAnnouncement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!announcementTitle.trim() || !announcementBody.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await publishAdminAnnouncement(createClient(), "global", announcementTitle.trim(), announcementBody.trim());
      setMessage("Announcement published.");
      setAnnouncementTitle("");
      setAnnouncementBody("");
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Could not publish the announcement.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Settings"
        description="Feature flags, emergency controls, announcements, and audit."
      />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}

      {loading ? (
        <AdminLoadingRows rows={4} />
      ) : (
        <>
          <AdminCard>
            <AdminCardHeader title="Feature flags" description="Gate individual product features platform-wide." />
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {flags.map((flag) => (
                <div key={flag.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{flag.name}</p>
                    <p className="truncate font-mono text-[10px] text-slate-400">{flag.key}</p>
                  </div>
                  <Toggle
                    checked={flag.enabled}
                    disabled={busy}
                    label={`Toggle ${flag.name}`}
                    onChange={(value) => void toggleFlag(flag, value)}
                  />
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard>
            <AdminCardHeader title="Emergency lockdown" description="Blocks every capability gate platform-wide. Super admin only." />
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Current state:</span>
                {emergency?.lockdown ? (
                  <AdminPill tone="danger">Lockdown active</AdminPill>
                ) : (
                  <AdminPill tone="success">Normal</AdminPill>
                )}
                {emergency?.reason ? <span className="text-sm text-slate-500">— {emergency.reason}</span> : null}
              </div>
              <AdminInput
                aria-label="Lockdown reason"
                placeholder="Reason (recorded in the audit log)"
                value={lockdownReason}
                maxLength={300}
                onChange={(event) => setLockdownReason(event.target.value)}
              />
              <div className="flex gap-2">
                <AdminButton
                  variant="danger"
                  disabled={busy || emergency?.lockdown === true}
                  onClick={() => void toggleLockdown(true)}
                >
                  Enable lockdown
                </AdminButton>
                <AdminButton
                  variant="secondary"
                  disabled={busy || emergency?.lockdown !== true}
                  onClick={() => void toggleLockdown(false)}
                >
                  Disable lockdown
                </AdminButton>
              </div>
              <p className="text-xs text-slate-400">
                Lockdown disables posting, messaging, and uploads platform-wide and switches all feature flags off.
              </p>
            </div>
          </AdminCard>

          <AdminCard>
            <AdminCardHeader title="Publish announcement" description="Shown to every student across the platform." />
            <form className="space-y-3 p-5" onSubmit={publishAnnouncement}>
              <AdminInput
                aria-label="Announcement title"
                placeholder="Title"
                value={announcementTitle}
                maxLength={200}
                onChange={(event) => setAnnouncementTitle(event.target.value)}
              />
              <AdminTextarea
                aria-label="Announcement body"
                placeholder="Body"
                value={announcementBody}
                maxLength={2000}
                rows={3}
                onChange={(event) => setAnnouncementBody(event.target.value)}
              />
              <AdminButton type="submit" variant="primary" disabled={busy}>
                {busy ? "Publishing…" : "Publish"}
              </AdminButton>
            </form>
          </AdminCard>

          {health ? (
            <AdminCard>
              <AdminCardHeader title="System health" />
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-5 text-sm">
                {(["database", "auth", "realtime", "storage", "rpc"] as const).map((key) => (
                  <span key={key} className="flex items-center gap-1.5 capitalize text-slate-600">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        health[key] === "online" ? "bg-emerald-500" : "bg-red-500"
                      )}
                    />
                    {key}
                  </span>
                ))}
                <span className="text-slate-400">activity 24h: {health.activity_events_24h}</span>
              </div>
            </AdminCard>
          ) : null}

          <AdminCard>
            <AdminCardHeader title="Recent audit entries" description="Every administrative action is recorded." />
            <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {audit.length === 0 ? (
                <p className="p-5 text-sm text-slate-400">No audit entries yet.</p>
              ) : (
                audit.map((entry, index) => (
                  <div key={index} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <p className="min-w-0 truncate text-sm text-slate-700">
                      <span className="font-medium text-slate-900">{entry.admin_name ?? entry.admin_id?.slice(0, 8) ?? "system"}</span>{" "}
                      {entry.action}
                      {entry.target_type ? <span className="text-slate-400"> → {entry.target_type}</span> : null}
                    </p>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <AdminPill tone={entry.result === "success" ? "success" : "warning"}>{entry.result}</AdminPill>
                      <span className="text-xs text-slate-400">{formatOrbitTime(entry.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AdminCard>
        </>
      )}
    </div>
  );
}
