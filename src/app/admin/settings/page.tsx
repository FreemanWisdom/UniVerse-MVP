"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-slate-400">Feature flags, emergency controls, announcements, and audit.</p>
      </div>

      {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}
      {message ? <p className="text-sm text-campus-400" role="status">{message}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-400" aria-live="polite">Loading settings…</p>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Feature flags (super admin)</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {flags.map((flag) => (
                  <div key={flag.key} className="flex items-center justify-between rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
                    <div>
                      <p className="text-sm text-slate-200">{flag.name}</p>
                      <p className="font-mono text-[10px] text-slate-500">{flag.key}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleFlag(flag, !flag.enabled)}
                      className={`rounded-lg border px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
                        flag.enabled
                          ? "border-campus-500/50 bg-campus-500/10 text-campus-400"
                          : "border-surface-300 bg-surface-100 text-slate-400"
                      }`}
                    >
                      {flag.enabled ? "On" : "Off"}
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Emergency lockdown (super admin)</p>
              <p className="text-sm text-slate-300">
                Current state:{" "}
                <span className={emergency?.lockdown ? "font-semibold text-red-400" : "font-semibold text-campus-400"}>
                  {emergency?.lockdown ? "LOCKDOWN ACTIVE" : "normal"}
                </span>
                {emergency?.reason ? ` — ${emergency.reason}` : ""}
              </p>
              <Input
                aria-label="Lockdown reason"
                placeholder="Reason (recorded in the audit log)"
                value={lockdownReason}
                maxLength={300}
                onChange={(event) => setLockdownReason(event.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy || emergency?.lockdown === true}
                  onClick={() => void toggleLockdown(true)}
                  className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:border-red-500 disabled:opacity-50"
                >
                  Enable lockdown
                </button>
                <button
                  type="button"
                  disabled={busy || emergency?.lockdown !== true}
                  onClick={() => void toggleLockdown(false)}
                  className="rounded-lg border border-surface-300 bg-surface-100 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-campus-500 disabled:opacity-50"
                >
                  Disable lockdown
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Lockdown blocks every capability gate (posting, messaging, uploads) platform-wide and flips all feature flags off.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Publish announcement</p>
              <form className="space-y-3" onSubmit={publishAnnouncement}>
                <Input
                  aria-label="Announcement title"
                  placeholder="Title"
                  value={announcementTitle}
                  maxLength={200}
                  onChange={(event) => setAnnouncementTitle(event.target.value)}
                />
                <textarea
                  aria-label="Announcement body"
                  placeholder="Body"
                  value={announcementBody}
                  maxLength={2000}
                  rows={3}
                  onChange={(event) => setAnnouncementBody(event.target.value)}
                  className="w-full rounded-lg border border-surface-300 bg-surface-50 p-3 text-sm text-foreground"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg border border-surface-300 bg-surface-100 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-campus-500 disabled:opacity-50"
                >
                  {busy ? "Publishing…" : "Publish"}
                </button>
              </form>
            </CardContent>
          </Card>

          {health ? (
            <Card>
              <CardContent className="space-y-2 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">System health</p>
                <div className="flex flex-wrap gap-3 text-sm">
                  {(["database", "auth", "realtime", "storage", "rpc"] as const).map((key) => (
                    <span key={key} className="text-slate-300">
                      {key}: <span className={health[key] === "online" ? "text-campus-400" : "text-red-400"}>{health[key]}</span>
                    </span>
                  ))}
                  <span className="text-slate-300">activity 24h: {health.activity_events_24h}</span>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="max-h-96 space-y-2 overflow-y-auto p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recent admin audit entries</p>
              {audit.length === 0 ? (
                <p className="text-sm text-slate-400">No audit entries yet.</p>
              ) : (
                audit.map((entry, index) => (
                  <div key={index} className="border-b border-surface-200/50 pb-2 text-sm last:border-0">
                    <p className="text-slate-300">
                      <span className="text-slate-400">{entry.admin_name ?? entry.admin_id?.slice(0, 8) ?? "system"}</span>{" "}
                      {entry.action} {entry.target_type ? `→ ${entry.target_type}` : ""}{" "}
                      <span className={entry.result === "success" ? "text-campus-400" : "text-amber-400"}>{entry.result}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">{formatOrbitTime(entry.created_at)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
