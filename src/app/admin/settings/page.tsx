"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminEmergencyState, AdminFeatureFlag } from "@/features/admin/admin.types";
import {
  getAdminEmergencyState,
  getAdminFeatureFlags,
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

/**
 * Settings — platform configuration only.
 * Announcements live under Communication; system health under Operations;
 * audit history under Security → Audit Logs.
 *
 * Administration (admin invitations, role management) is a future section
 * pending its schema change (E3). No placeholder UI is shown for it yet.
 */
export default function AdminSettingsPage() {
  const [flags, setFlags] = useState<AdminFeatureFlag[]>([]);
  const [emergency, setEmergency] = useState<AdminEmergencyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lockdownReason, setLockdownReason] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const [flagRows, emergencyState] = await Promise.all([
        getAdminFeatureFlags(supabase),
        getAdminEmergencyState(supabase),
      ]);
      setFlags(flagRows);
      setEmergency(emergencyState);
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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Settings"
        description="Platform configuration: feature flags and emergency controls."
      />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}

      {loading ? (
        <AdminLoadingRows rows={3} />
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
              <div className="flex flex-wrap items-center gap-2">
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
              <div className="flex flex-wrap gap-2">
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
                Every change is recorded in the audit log.
              </p>
            </div>
          </AdminCard>

          <AdminAlert tone="neutral">
            Platform administration (admin invitations, role management) will appear here once its
            backend change is approved and implemented. It is intentionally not shown yet.
          </AdminAlert>
        </>
      )}
    </div>
  );
}
