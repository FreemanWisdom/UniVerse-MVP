"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminPill,
  AdminSearchBar,
  AdminSelect,
} from "@/components/admin/ui";
import { cn } from "@/lib/utils/cn";
import {
  AdminListedUser,
  AdminRoleName,
  AdminSchool,
  AdminUserDetail,
} from "@/features/admin/admin.types";
import {
  getAdminUserDetail,
  grantAdminRole,
  listAdminSchools,
  listAdminUsers,
} from "@/services/admin/admin.service";

const ROLES: Array<{ value: AdminRoleName; label: string }> = [
  { value: "super_admin", label: "Super admin (full platform control)" },
  { value: "platform_admin", label: "Platform admin" },
  { value: "school_admin", label: "School admin (campus-scoped)" },
  { value: "moderator", label: "Moderator" },
];

const ROLE_LABEL: Record<AdminRoleName, string> = {
  super_admin: "Super admin",
  platform_admin: "Platform admin",
  school_admin: "School admin",
  moderator: "Moderator",
};

const FRIENDLY: Record<string, string> = {
  super_admin_required: "Only a super admin can manage administrator roles.",
  school_required_for_school_admin: "School admins need a campus — pick a school first.",
  school_not_found: "That school no longer exists. Refresh and try again.",
  user_not_found: "That user no longer exists. Search again.",
  invalid_role: "Pick a valid role.",
  role_not_configured: "That role is not configured in the backend. Contact the platform team.",
  last_super_admin_lockout_protection:
    "Blocked: this would leave the platform with no active super admin.",
  authentication_required: "Your session expired — sign in again.",
};

function friendlyError(message: unknown, fallback: string): string {
  const text = message instanceof Error ? message.message : String(message ?? "");
  for (const code of Object.keys(FRIENDLY)) {
    if (text.includes(code)) return FRIENDLY[code];
  }
  return text || fallback;
}

/**
 * Administration — grant/revoke platform roles. Super admin only.
 *
 * The RPC (public.admin_grant_role) is the real authorization boundary: it
 * re-checks admin.is_super_admin() server-side on every call, upserts
 * admin.members (never writable by clients), enforces last-super-admin
 * lockout protection, and audits every grant and revocation. This UI merely
 * calls it; nothing here can authorize anything on its own.
 */
export function AdministrationSection({
  selfUserId,
}: {
  selfUserId: string;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<AdminListedUser[]>([]);
  const [selected, setSelected] = useState<AdminListedUser | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [role, setRole] = useState<AdminRoleName>("moderator");
  const [schoolId, setSchoolId] = useState("");
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      listAdminSchools(createClient())
        .then((rows) => setSchools(rows))
        .catch(() => setSchools([]));
    });
  }, []);

  const loadDetail = async (userId: string) => {
    setDetail(null);
    try {
      const row = await getAdminUserDetail(createClient(), userId);
      setDetail(row);
      if (row.admin_role && row.admin_role_active) {
        setRole(row.admin_role);
        setSchoolId(row.admin_role_school_id ?? "");
      }
    } catch {
      setDetail(null);
    }
  };

  const runSearch = async () => {
    setSearching(true);
    setError(null);
    setMessage(null);
    setSelected(null);
    setDetail(null);
    try {
      const rows = await listAdminUsers(createClient(), {
        search: search.trim() || null,
        limit: 8,
      });
      setResults(rows);
      if (rows.length === 0) {
        setError("No users match that search.");
      }
    } catch (searchError) {
      setError(friendlyError(searchError, "Could not search users."));
    } finally {
      setSearching(false);
    }
  };

  const confirmText = (enabled: boolean, userName: string) => {
    const verb = enabled ? "GRANT" : "REVOKE";
    const base = `${verb} "${ROLE_LABEL[role]}" for ${userName}? This changes what they can access.`;
    if (role === "super_admin") {
      return (
        base +
        (enabled
          ? " Super admins have full platform control — make sure you trust this person."
          : " WARNING: removing super admin access is a high-impact change.")
      );
    }
    return base;
  };

  const apply = async (enabled: boolean) => {
    if (!selected) return;
    const userName = selected.full_name ?? selected.email;
    if (role === "school_admin" && !schoolId) {
      setError("Pick a school for this school admin first.");
      return;
    }
    if (!window.confirm(confirmText(enabled, userName))) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await grantAdminRole(
        createClient(),
        selected.id,
        role,
        enabled,
        role === "school_admin" ? schoolId : null
      );
      setMessage(
        enabled
          ? `${ROLE_LABEL[role]} granted to ${userName}.`
          : `${ROLE_LABEL[role]} revoked from ${userName}.`
      );
      await loadDetail(selected.id);
    } catch (applyError) {
      setError(friendlyError(applyError, "Could not apply the change."));
    } finally {
      setBusy(false);
    }
  };

  const selfSelected = selected?.id === selfUserId;

  return (
    <AdminCard>
      <AdminCardHeader
        title="Administration"
        description="Grant or revoke administrator roles. Super admin only; every change is audited."
      />
      <div className="space-y-4 p-5">
        <AdminSearchBar
          label="Search users by name or email"
          placeholder="Search users by name or email…"
          value={search}
          onChange={setSearch}
          onSubmit={() => void runSearch()}
          busy={searching}
        />

        {results.length > 0 ? (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200">
            {results.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(user);
                    setError(null);
                    setMessage(null);
                    void loadDetail(user.id);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                    selected?.id === user.id && "bg-blue-50"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {user.full_name ?? "Unnamed"}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{user.email}</span>
                  </span>
                  {selected?.id === user.id ? (
                    <AdminPill tone="info">Selected</AdminPill>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {selected ? (
          <div className="space-y-4 rounded-lg border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {selected.full_name ?? "Unnamed"}
                </p>
                <p className="text-xs text-slate-500">{selected.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Current role:</span>
                {detail?.admin_role && detail.admin_role_active ? (
                  <AdminPill tone="info">
                    {ROLE_LABEL[detail.admin_role]}
                    {detail.admin_role === "school_admin" && detail.admin_role_school_id
                      ? ` — ${
                          schools.find((s) => s.id === detail.admin_role_school_id)?.name ?? "campus"
                        }`
                      : ""}
                  </AdminPill>
                ) : detail ? (
                  <AdminPill tone="neutral">No active role</AdminPill>
                ) : (
                  <span className="text-xs text-slate-400">Loading…</span>
                )}
              </div>
            </div>

            {selfSelected ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                This is your own account — changing your role changes your own access immediately.
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500">Role</span>
                <AdminSelect
                  aria-label="Role"
                  value={role}
                  onChange={(event) => setRole(event.target.value as AdminRoleName)}
                >
                  {ROLES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AdminSelect>
              </label>
              {role === "school_admin" ? (
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">School</span>
                  <AdminSelect
                    aria-label="School"
                    value={schoolId}
                    onChange={(event) => setSchoolId(event.target.value)}
                  >
                    <option value="">Select a school…</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </AdminSelect>
                </label>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <AdminButton variant="primary" disabled={busy} onClick={() => void apply(true)}>
                Grant role
              </AdminButton>
              <AdminButton variant="secondary" disabled={busy} onClick={() => void apply(false)}>
                Revoke role
              </AdminButton>
            </div>
            <p className="text-xs text-slate-400">
              Grants and revocations are confirmed before they run and recorded in the audit log.
              The server blocks changes that would leave no active super admin.
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}
      </div>
    </AdminCard>
  );
}
