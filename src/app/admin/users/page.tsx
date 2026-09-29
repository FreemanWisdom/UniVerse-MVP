"use client";

import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatOrbitTime } from "@/features/orbit/orbit.utils";
import { AdminListedUser, AdminUserAction } from "@/features/admin/admin.types";
import {
  adminUpdateUser,
  listAdminUsers,
  listAdminSchools,
  setAdminUserRestrictions,
  setCampusAdmin,
} from "@/services/admin/admin.service";
import { useSearchParams } from "next/navigation";
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
  { action: "student_verify", label: "Student Verify", variant: "primary" },
  { action: "student_unverify", label: "Student Unverify", variant: "secondary" },
];

const CAPABILITIES = [
  { key: "can_post", label: "Post" },
  { key: "can_message", label: "Message" },
  { key: "can_upload", label: "Upload" },
  { key: "can_use_whisper", label: "Whisper" },
  { key: "can_marketplace", label: "Marketplace" },
] as const;

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "banned", label: "Banned" },
  { value: "restricted", label: "Restricted" },
] as const;

const TRISTATE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

function AdminUsersPageInner() {
  const params = useSearchParams();
  const [users, setUsers] = useState<AdminListedUser[]>([]);
  const [search, setSearch] = useState("");
  const [universityFilter, setUniversityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [studentVerifiedFilter, setStudentVerifiedFilter] = useState("");
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [adminSchoolId, setAdminSchoolId] = useState("");
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

  const load = async (offsetPage: number, overrides?: { status?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const status = overrides?.status ?? statusFilter;
      const rows = await listAdminUsers(createClient(), {
        search: search.trim() ? search.trim() : null,
        university: universityFilter || null,
        status: (status || null) as "active" | "suspended" | "banned" | "restricted" | null,
        verified: verifiedFilter === "" ? null : verifiedFilter === "yes",
        studentVerified: studentVerifiedFilter === "" ? null : studentVerifiedFilter === "yes",
        offset: offsetPage * PAGE_SIZE,
        limit: PAGE_SIZE,
      });
      setUsers(rows);
      setHasMore(rows.length === PAGE_SIZE);
      setPage(offsetPage);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  const reload = async (overrides?: { status?: string }) => {
    await load(page, overrides);
  };

  useEffect(() => {
    queueMicrotask(async () => {
      // deep links from Overview attention items, e.g. /admin/users?status=restricted
      const deepStatus = params.get("status");
      if (deepStatus) setStatusFilter(deepStatus);
      try {
        const schoolRows = await listAdminSchools(createClient());
        setSchools(schoolRows.map((school) => ({ id: school.id, name: school.name })));
      } catch {
        // university filter options are optional — the page still works without them
      }
      if (deepStatus) {
        await load(0, { status: deepStatus });
      } else {
        await load(0);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAction = async (user: AdminListedUser, action: AdminUserAction) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await adminUpdateUser(createClient(), user.id, action);
      setMessage(`${user.full_name ?? user.email} — action applied (${action}).`);
      await reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The action failed.");
    } finally {
      setBusy(false);
    }
  };

  const runCampusAdmin = async (user: AdminListedUser, enabled: boolean) => {
    if (!adminSchoolId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await setCampusAdmin(createClient(), user.id, adminSchoolId, enabled);
      setMessage(
        enabled
          ? `Campus admin granted for ${user.full_name ?? user.email}.`
          : `Campus admin removed for ${user.full_name ?? user.email}.`
      );
    } catch (adminError) {
      setError(
        adminError instanceof Error && adminError.message === "super_admin_required"
          ? "Only a super admin can assign campus admins."
          : adminError instanceof Error
            ? adminError.message
            : "Could not change campus admin access."
      );
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
        onSubmit={() => void load(0)}
        busy={busy}
      />

      <AdminCard className="flex flex-wrap items-end gap-3 p-4">
        <label className="flex min-w-40 flex-1 flex-col gap-1 sm:max-w-56">
          <span className="text-xs font-medium text-slate-500">University</span>
          <select
            aria-label="Filter by university"
            value={universityFilter}
            onChange={(event) => setUniversityFilter(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All universities</option>
            {schools.map((school) => (
              <option key={school.id} value={school.name}>{school.name}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-36 flex-1 flex-col gap-1 sm:max-w-44">
          <span className="text-xs font-medium text-slate-500">Account status</span>
          <select
            aria-label="Filter by account status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-28 flex-1 flex-col gap-1 sm:max-w-36">
          <span className="text-xs font-medium text-slate-500">Email verified</span>
          <select
            aria-label="Filter by email verification"
            value={verifiedFilter}
            onChange={(event) => setVerifiedFilter(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {TRISTATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-28 flex-1 flex-col gap-1 sm:max-w-36">
          <span className="text-xs font-medium text-slate-500">Student verified</span>
          <select
            aria-label="Filter by student verification"
            value={studentVerifiedFilter}
            onChange={(event) => setStudentVerifiedFilter(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {TRISTATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <AdminButton variant="primary" size="sm" disabled={loading} onClick={() => void load(0)}>
          Apply filters
        </AdminButton>
      </AdminCard>

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
                        {user.student_verified ? <AdminPill tone="info">student verified</AdminPill> : null}
                        {(user.account_status ?? "active") === "suspended" ? <AdminPill tone="warning">suspended</AdminPill> : null}
                        {(user.account_status ?? "active") === "banned" ? <AdminPill tone="danger">banned</AdminPill> : null}
                        {(user.account_status ?? "active") === "restricted" ? <AdminPill tone="warning">restricted</AdminPill> : null}
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
                        Campus admin
                      </p>
                      <p className="text-xs text-slate-500">
                        Grant or revoke this user&apos;s campus administrator access for a school.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label="School for campus admin"
                          value={adminSchoolId}
                          onChange={(event) => setAdminSchoolId(event.target.value)}
                          className="h-9 min-w-52 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">Select school…</option>
                          {schools.map((school) => (
                            <option key={school.id} value={school.id}>
                              {school.name}
                            </option>
                          ))}
                        </select>
                        <AdminButton
                          variant="secondary"
                          size="sm"
                          disabled={busy || !adminSchoolId}
                          onClick={() => void runCampusAdmin(user, true)}
                        >
                          Make campus admin
                        </AdminButton>
                        <AdminButton
                          variant="ghost"
                          size="sm"
                          disabled={busy || !adminSchoolId}
                          onClick={() => void runCampusAdmin(user, false)}
                        >
                          Remove
                        </AdminButton>
                      </div>
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
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="min-w-0 flex-1 text-xs text-slate-400">
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

      {!loading && users.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Showing page {page + 1} — users {page * PAGE_SIZE + 1}&ndash;{page * PAGE_SIZE + users.length}
          </p>
          <div className="flex gap-2">
            <AdminButton
              variant="secondary"
              size="sm"
              disabled={page === 0 || busy || loading}
              onClick={() => void load(page - 1)}
            >
              Previous
            </AdminButton>
            <AdminButton
              variant="secondary"
              size="sm"
              disabled={!hasMore || busy || loading}
              onClick={() => void load(page + 1)}
            >
              Next
            </AdminButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<AdminLoadingRows rows={4} />}>
      <AdminUsersPageInner />
    </Suspense>
  );
}
