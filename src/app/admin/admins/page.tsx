"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminMember, AdminRoleName, AdminSchool } from "@/features/admin/admin.types";
import { ROLE_LABEL, ADMIN_ROLES, friendlyAdminError } from "@/features/admin/roles";
import {
  adminBootstrap,
  grantAdminRole,
  listAdminSchools,
  listAdmins,
} from "@/services/admin/admin.service";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminLoadingRows,
  AdminPageHeader,
  AdminPill,
  AdminSelect,
  AdminTableWrap,
  AdminTD,
  AdminTH,
} from "@/components/admin/ui";
import { cn } from "@/lib/utils/cn";

/**
 * Administrators — read-only roster for every admin (admin_list_admins is
 * admin-gated; emails follow the admin_get_user precedent). Managing roles
 * stays super-admin-only through the existing admin_grant_role RPC — the
 * same path used by Settings → Administration, so there is one management
 * backend, not two. Every change is audited server-side by the RPC.
 */
export default function AdminAdminsPage() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [self, setSelf] = useState<{ userId: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [managing, setManaging] = useState<string | null>(null);
  const [role, setRole] = useState<AdminRoleName>("moderator");
  const [schoolId, setSchoolId] = useState("");
  const [busy, setBusy] = useState(false);

  const isSuperAdmin = self?.role === "super_admin";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const [bootstrap, rows] = await Promise.all([
        adminBootstrap(supabase),
        listAdmins(supabase),
      ]);
      setSelf({ userId: bootstrap.admin?.user_id ?? "", role: bootstrap.admin?.role ?? "" });
      setMembers(rows);
    } catch (e) {
      setError(friendlyAdminError(e, "Could not load the administrator roster."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void load();
      listAdminSchools(createClient()).then(setSchools).catch(() => setSchools([]));
    });
  }, []);

  const startManage = (m: AdminMember) => {
    setManaging(managing === m.user_id ? null : m.user_id);
    setRole(m.role);
    setSchoolId(m.school_id ?? "");
    setMessage(null);
    setError(null);
  };

  const apply = async (m: AdminMember, enabled: boolean) => {
    const label = ROLE_LABEL[role];
    if (role === "school_admin" && enabled && !schoolId) {
      setError("Pick a school for this school admin first.");
      return;
    }
    if (
      !window.confirm(
        `${enabled ? "GRANT" : "REVOKE"} "${label}" for ${m.full_name || m.email}? This changes what they can access.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await grantAdminRole(
        createClient(),
        m.user_id,
        role,
        enabled,
        role === "school_admin" ? schoolId : null
      );
      setMessage(`${label} ${enabled ? "granted to" : "revoked from"} ${m.full_name || m.email}.`);
      setManaging(null);
      await load();
    } catch (e) {
      setError(friendlyAdminError(e, "Could not apply the change."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Administrators"
        description="Everyone with console access, their role and campus. Management is super-admin only."
      />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}

      <AdminCardHeader
        title="All admins"
        description={
          isSuperAdmin
            ? "Change a role or campus with Manage. Every change is audited."
            : "Read-only view. Only super admins can manage roles (Settings → Administration)."
        }
      />
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <AdminLoadingRows rows={4} />
        </div>
      ) : (
        <AdminTableWrap>
          <thead>
            <tr>
              <AdminTH>Name</AdminTH>
              <AdminTH>Email</AdminTH>
              <AdminTH>Role</AdminTH>
              <AdminTH>Campus</AdminTH>
              <AdminTH>Status</AdminTH>
              <AdminTH>Granted</AdminTH>
              {isSuperAdmin ? <AdminTH className="text-right">Manage</AdminTH> : null}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <AdminMemberRow
                key={m.user_id}
                m={m}
                isSuperAdmin={isSuperAdmin}
                isSelf={self?.userId === m.user_id}
                expanded={managing === m.user_id}
                onManage={() => startManage(m)}
              />
            ))}
          </tbody>
        </AdminTableWrap>
      )}

      {managing ? (
        <AdminCard>
          <AdminCardHeader
            title={`Manage ${members.find((m) => m.user_id === managing)?.full_name || "administrator"}`}
            description="Role changes apply immediately and are audited (admin_grant_role)."
          />
          <div className="space-y-4 p-5">
            <label className="block text-xs font-medium text-slate-600">
              Role
              <AdminSelect
                className="mt-1"
                value={role}
                onChange={(e) => setRole(e.target.value as AdminRoleName)}
              >
                {ADMIN_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </AdminSelect>
            </label>
            {role === "school_admin" ? (
              <label className="block text-xs font-medium text-slate-600">
                Campus
                <AdminSelect
                  className="mt-1"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                >
                  <option value="">Pick a school…</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </AdminSelect>
              </label>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <AdminButton variant="primary" disabled={busy} onClick={() => void apply(members.find((m) => m.user_id === managing)!, true)}>
                Save role
              </AdminButton>
              <AdminButton
                variant="dangerSoft"
                disabled={busy}
                onClick={() => void apply(members.find((m) => m.user_id === managing)!, false)}
              >
                Revoke access
              </AdminButton>
              <AdminButton variant="ghost" onClick={() => setManaging(null)}>
                Cancel
              </AdminButton>
            </div>
          </div>
        </AdminCard>
      ) : null}
    </>
  );
}

function AdminMemberRow({
  m,
  isSuperAdmin,
  isSelf,
  expanded,
  onManage,
}: {
  m: AdminMember;
  isSuperAdmin: boolean;
  isSelf: boolean;
  expanded: boolean;
  onManage: () => void;
}) {
  return (
    <>
      <tr className={cn("border-t border-slate-200", expanded && "bg-blue-50/50")}>
        <AdminTD>
          <span className="font-medium text-slate-900">
            {m.full_name || "Unnamed"}
            {isSelf ? <span className="ml-1.5 text-xs text-slate-400">(you)</span> : null}
          </span>
        </AdminTD>
        <AdminTD className="text-slate-500">{m.email || "—"}</AdminTD>
        <AdminTD>
          <AdminPill tone={m.role === "super_admin" ? "info" : "neutral"}>
            {ROLE_LABEL[m.role] ?? m.role}
          </AdminPill>
        </AdminTD>
        <AdminTD className="text-slate-500">{m.school_name ?? "—"}</AdminTD>
        <AdminTD>
          {m.is_active ? (
            <AdminPill tone="success">Active</AdminPill>
          ) : (
            <AdminPill tone="warning">Inactive</AdminPill>
          )}
        </AdminTD>
        <AdminTD className="whitespace-nowrap text-xs text-slate-500">
          {m.granted_at ? new Date(m.granted_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}
        </AdminTD>
        {isSuperAdmin ? (
          <AdminTD className="text-right">
            <AdminButton variant="secondary" onClick={onManage}>
              {expanded ? "Close" : "Manage"}
            </AdminButton>
          </AdminTD>
        ) : null}
      </tr>
    </>
  );
}
