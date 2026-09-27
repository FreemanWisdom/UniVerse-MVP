"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { formatOrbitTime } from "@/features/orbit/orbit.utils";
import {
  AdminListedUser,
  AdminUserAction,
} from "@/features/admin/admin.types";
import {
  adminUpdateUser,
  listAdminUsers,
  setAdminUserRestrictions,
} from "@/services/admin/admin.service";

const STATUS_ACTIONS: Array<{ action: AdminUserAction; label: string; tone: string }> = [
  { action: "verify", label: "Verify", tone: "text-campus-400" },
  { action: "unverify", label: "Unverify", tone: "text-slate-300" },
  { action: "suspend", label: "Suspend", tone: "text-amber-400" },
  { action: "unsuspend", label: "Unsuspend", tone: "text-slate-300" },
  { action: "ban", label: "Ban", tone: "text-red-400" },
  { action: "restrict", label: "Restrict", tone: "text-amber-400" },
  { action: "unrestrict", label: "Unrestrict", tone: "text-slate-300" },
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
      setMessage(`${user.full_name ?? user.email}: ${action} applied.`);
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Users</h1>
        <p className="text-sm text-slate-400">Search, verify, suspend, and restrict platform accounts.</p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void load(search);
        }}
      >
        <Input
          aria-label="Search users"
          placeholder="Search by name, email, or university…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-surface-300 bg-surface-100 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-campus-500"
        >
          Search
        </button>
      </form>

      {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}
      {message ? <p className="text-sm text-campus-400" role="status">{message}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-400" aria-live="polite">Loading users…</p>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-400">No users matched that search.</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {user.full_name ?? "Unnamed"}{" "}
                      {user.is_verified ? <span className="text-[11px] text-campus-400">· verified</span> : null}
                      {user.is_suspended ? <span className="text-[11px] text-amber-400"> · suspended</span> : null}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {user.email} · {user.university ?? "no university"} · {user.level ?? "—"} · joined {formatOrbitTime(user.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === user.id ? null : user.id)}
                    className="shrink-0 rounded-lg border border-surface-300 px-3 py-1 text-xs text-slate-300 hover:border-campus-500"
                  >
                    {expanded === user.id ? "Close" : "Manage"}
                  </button>
                </div>

                {expanded === user.id ? (
                  <div className="space-y-3 border-t border-surface-200 pt-3">
                    <div className="flex flex-wrap gap-2">
                      {STATUS_ACTIONS.map(({ action, label, tone }) => (
                        <button
                          key={action}
                          type="button"
                          disabled={busy}
                          onClick={() => void runAction(user, action)}
                          className={`rounded-lg border border-surface-300 bg-surface-100 px-3 py-1 text-xs font-semibold hover:border-campus-500 disabled:opacity-50 ${tone}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2 rounded-lg border border-surface-200 bg-surface-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Restrictions (capability limits)
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {CAPABILITIES.map(({ key, label }) => (
                          <label key={key} className="flex items-center gap-1 text-xs text-slate-300">
                            <input
                              type="checkbox"
                              checked={restrictions[key]}
                              onChange={(event) =>
                                setRestrictions((current) => ({ ...current, [key]: event.target.checked }))
                              }
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                      <Input
                        aria-label="Restriction reason"
                        placeholder="Reason (optional)"
                        value={restrictionReason}
                        maxLength={300}
                        onChange={(event) => setRestrictionReason(event.target.value)}
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void applyRestrictions(user)}
                        className="rounded-lg border border-surface-300 bg-surface-100 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-campus-500 disabled:opacity-50"
                      >
                        {busy ? "Saving…" : "Save restrictions"}
                      </button>
                      <p className="text-[11px] text-slate-500">
                        Unchecked capabilities block the user server-side until restrictions are changed again.
                      </p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
