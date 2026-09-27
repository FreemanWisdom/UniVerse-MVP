"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatOrbitTime } from "@/features/orbit/orbit.utils";
import { AdminListedUser, AdminUserAction } from "@/features/admin/admin.types";
import {
  adminUpdateUser,
  listAdminUsers,
  setAdminUserRestrictions,
} from "@/services/admin/admin.service";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminInput,
  AdminLoadingRows,
  AdminPageHeader,
  AdminPill,
  AdminSearchBar,
} from "@/components/admin/ui";
import { IconChevronDown } from "@/components/admin/icons";
import { cn } from "@/lib/utils/cn";

const STATUS_ACTIONS: Array<{ action: AdminUserAction; label: string; variant: "primary" | "secondary" | "dangerSoft" | "ghost" }> = [
  { action: "verify", label: "Verify", variant: "primary" },
  { action: "unverify", label: "Unverify", variant: "secondary" },
  { action: "suspend", label: "Suspend", variant: "dangerSoft" },
  { action: "unsuspend", label: "Unsuspend", variant: "secondary" },
  { action: "ban", label: "Ban", variant: "dangerSoft" },
  { action: "restrict", label: "Restrict", variant: "dangerSoft" },
  { action: "unrestrict", label: "Unrestrict", variant: "secondary" },
];

const CAPABILITIES = [
  { key: "can_post", label: "Post" },
  { key: "can_message", label: "Message" },
  { key: "can_upload", label: "Upload" },
  { key: "can_use_whisper", label: "Whisper" },
  { key: "can_marketplace", label: "Marketplace" },
] as const;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminListedUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [restrictions, setRestrictions] = useState<Record<string, boolean>>({
    can_post: true,
    can_message: true,
    can_upload: true,
    can_use_whisper: true,
    can_marketplace: true,
  });
  const [restrictionReason, setRestrictionReason] = useState("");

  const load = async (searchValue: string) => {
    setLoading(true);
    setError(null);
    try {
      const trimmed = searchValue.trim();
      setUsers(await listAdminUsers(createClient(), trimmed ? trimmed : null));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => void load(""));
  }, []);

  const runAction = async (user: AdminListedUser, action: AdminUserAction) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await adminUpdateUser(createClient(), user.id, action);
      setMessage(`${user.full_name ?? user.email} — action applied (${action}).`);
      await load(search);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The action failed.");
    } finally {
      setBusy(false);
    }
  };

  const applyRestrictions = async (user: AdminListedUser) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await setAdminUserRestrictions(createClient(), user.id, {
        can_post: restrictions.can_post,
        can_message: restrictions.can_message,
        can_upload: restrictions.can_upload,
        can_use_whisper: restrictions.can_use_whisper,
        can_marketplace: restrictions.can_marketplace,
        reason: restrictionReason.trim() || null,
        expires_at: null,
      });
      setMessage(`Restrictions saved for ${user.full_name ?? user.email}.`);
      setExpanded(null);
    } catch (restrictionError) {
      setError(restrictionError instanceof Error ? restrictionError.message : "Could not save restrictions.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Users" description="Search, verify, suspend, and restrict platform accounts." />

      <AdminSearchBar
        label="Search users"
        placeholder="Search by name, email, or university…"
        value={search}
        onChange={setSearch}
        onSubmit={() => void load(search)}
        busy={busy}
      />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}

      {loading ? (
        <AdminLoadingRows rows={4} />
      ) : users.length === 0 ? (
        <AdminCard>
          <AdminEmptyState title="No users matched that search" description="Try a different name, email, or university." />
        </AdminCard>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const isExpanded = expanded === user.id;
            return (
              <AdminCard key={user.id} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                      {(user.full_name ?? user.email ?? "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {user.full_name ?? "Unnamed"}
                        </p>
                        {user.is_verified ? <AdminPill tone="success">verified</AdminPill> : null}
                        {user.is_suspended ? <AdminPill tone="warning">suspended</AdminPill> : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {user.email} · {user.university ?? "no university"} · {user.level ?? "—"} · joined{" "}
                        {formatOrbitTime(user.created_at)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : user.id)}
                    aria-expanded={isExpanded}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    {isExpanded ? "Close" : "Manage"}
                    <IconChevronDown size={13} className={cn("transition-transform", isExpanded && "rotate-180")} />
                  </button>
                </div>

                {isExpanded ? (
                  <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex flex-wrap gap-2">
                      {STATUS_ACTIONS.map(({ action, label, variant }) => (
                        <AdminButton key={action} variant={variant} size="sm" disabled={busy} onClick={() => void runAction(user, action)}>
                          {label}
                        </AdminButton>
                      ))}
                    </div>

                    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Capability restrictions
                      </p>
                      <div className="flex flex-wrap gap-x-5 gap-y-2">
                        {CAPABILITIES.map(({ key, label }) => (
                          <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={restrictions[key]}
                              onChange={(event) =>
                                setRestrictions((current) => ({ ...current, [key]: event.target.checked }))
                              }
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                      <AdminInput
                        aria-label="Restriction reason"
                        placeholder="Reason (optional, shown in audit log)"
                        value={restrictionReason}
                        maxLength={300}
                        onChange={(event) => setRestrictionReason(event.target.value)}
                      />
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-400">
                          Unchecked capabilities are blocked server-side until changed again.
                        </p>
                        <AdminButton variant="primary" size="sm" disabled={busy} onClick={() => void applyRestrictions(user)}>
                          {busy ? "Saving…" : "Save restrictions"}
                        </AdminButton>
                      </div>
                    </div>
                  </div>
                ) : null}
              </AdminCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
