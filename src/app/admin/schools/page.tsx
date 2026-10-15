"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminSchool } from "@/features/admin/admin.types";
import { listAdminSchools, setCampusAdmin, upsertAdminSchool } from "@/services/admin/admin.service";
import {
  AdminSchoolDetails,
  AdminSchoolSearchRow,
  AdminSchoolUser,
  AdminSchoolUsersResult,
  getAdminSchoolDetails,
  listAdminSchoolUsers,
  searchAdminSchools,
} from "@/services/admin/admin-schools-invitations.service";
import { LAUNCH_SCHOOLS } from "@/lib/launch";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminInput,
  AdminLoadingRows,
  AdminPageHeader,
  AdminPill,
  AdminSelect,
  AdminTD,
  AdminTH,
  AdminTableWrap,
} from "@/components/admin/ui";

const PAGE_SIZE = 10;

function pioneerLabel(name: string): string | null {
  return LAUNCH_SCHOOLS.find((s) => s.name === name)?.label ?? null;
}

/** Row shape shared by the default (pioneer) list and search results. */
interface SchoolRow {
  id: string;
  name: string;
  tag: string;
  registered: number;
  waitlisted: number;
  new30d: number;
  verificationEnabled: boolean;
  isPioneer: boolean;
}

export default function AdminSchoolsPage() {
  // All-schools fetch (existing RPC) powers the pioneer default view and
  // the verification/active merge for details.
  const [allSchools, setAllSchools] = useState<AdminSchool[]>([]);
  const [baseLoading, setBaseLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // search
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchRows, setSearchRows] = useState<SchoolRow[] | null>(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(0);

  // details
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [details, setDetails] = useState<AdminSchoolDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRows, setUserRows] = useState<AdminSchoolUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // manage tools (existing super-admin forms, unchanged behavior)
  const [manageOpen, setManageOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [adminUserId, setAdminUserId] = useState("");
  const [adminSchoolId, setAdminSchoolId] = useState("");
  const [adminEnabled, setAdminEnabled] = useState(true);

  const toRow = (school: AdminSchool): SchoolRow => ({
    id: school.id,
    name: school.name,
    tag: school.tag,
    registered: -1, // not requested for the default list; details shows real counts
    waitlisted: -1,
    new30d: -1,
    verificationEnabled: school.verification_enabled,
    isPioneer: pioneerLabel(school.name) !== null,
  });

  const loadBase = async () => {
    setBaseLoading(true);
    try {
      setAllSchools(await listAdminSchools(createClient()));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load schools.");
    } finally {
      setBaseLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => void loadBase());
  }, []);

  const runSearch = async (q: string, page: number) => {
    setSearching(true);
    setSearchRows(null);
    try {
      const result = await searchAdminSchools(createClient(), q, PAGE_SIZE, page * PAGE_SIZE);
      const byId = new Map(allSchools.map((s) => [s.id, s]));
      setSearchRows(
        result.rows.map((row: AdminSchoolSearchRow) => ({
          id: row.id,
          name: row.name,
          tag: row.tag,
          registered: row.registered_users,
          waitlisted: row.waitlisted_users,
          new30d: row.new_users_30d,
          verificationEnabled: byId.get(row.id)?.verification_enabled ?? false,
          isPioneer: pioneerLabel(row.name) !== null,
        }))
      );
      setSearchTotal(result.total);
      setSearchPage(page);
      setSubmittedQuery(q);
      setError(null);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "The search failed.");
    } finally {
      setSearching(false);
    }
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    void runSearch(query.trim(), 0);
  };

  const openSchool = (row: SchoolRow) => {
    setSelectedId(row.id);
    setSelectedName(row.name);
    setDetails(null);
    setUserSearch("");
    setUserPage(0);
    setUserRows([]);
    setUserTotal(0);
    setUserError(null);
  };

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    // queueMicrotask keeps setState out of the synchronous effect window
    // (project lint rule).
    queueMicrotask(() => void (async () => {
      if (cancelled) return;
      setDetailsLoading(true);
      setDetails(null);
      try {
        const loaded = await getAdminSchoolDetails(createClient(), selectedId);
        if (!cancelled) setDetails(loaded);
      } catch (detailsError) {
        if (!cancelled) setUserError(detailsError instanceof Error ? detailsError.message : "Unable to load school details.");
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    })());
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    queueMicrotask(() => void (async () => {
      if (cancelled) return;
      setUsersLoading(true);
      setUserError(null);
      try {
        const result: AdminSchoolUsersResult = await listAdminSchoolUsers(
          createClient(),
          selectedId,
          userSearch,
          PAGE_SIZE,
          userPage * PAGE_SIZE
        );
        if (!cancelled) {
          setUserRows(result.rows);
          setUserTotal(result.total);
        }
      } catch (listError) {
        if (!cancelled) setUserError(listError instanceof Error ? listError.message : "Unable to load users.");
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    })());
    return () => {
      cancelled = true;
    };
  }, [selectedId, userSearch, userPage]);

  // ---- manage tools (existing super-admin flows, unchanged) ----
  const saveSchool = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !tag.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await upsertAdminSchool(createClient(), null, name.trim(), tag.trim());
      setMessage(`School “${name.trim()}” saved.`);
      setName("");
      setTag("");
      await loadBase();
    } catch (saveError) {
      setError(
        saveError instanceof Error && saveError.message === "super_admin_required"
          ? "Only a super admin can create or edit schools."
          : saveError instanceof Error
            ? saveError.message
            : "Could not save the school."
      );
    } finally {
      setBusy(false);
    }
  };

  const assignAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adminUserId.trim() || !adminSchoolId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await setCampusAdmin(createClient(), adminUserId.trim(), adminSchoolId, adminEnabled);
      setMessage(adminEnabled ? "Campus admin assigned." : "Campus admin removed.");
      setAdminUserId("");
    } catch (assignError) {
      setError(
        assignError instanceof Error && assignError.message === "super_admin_required"
          ? "Only a super admin can assign campus admins."
          : assignError instanceof Error
            ? assignError.message
            : "Could not assign the campus admin."
      );
    } finally {
      setBusy(false);
    }
  };

  // ---- render helpers ----
  const pioneerRows: SchoolRow[] = allSchools
    .filter((s) => pioneerLabel(s.name) !== null)
    .sort((a, b) => pioneerLabel(a.name)!.localeCompare(pioneerLabel(b.name)!))
    .map(toRow);

  const list = searchRows ?? pioneerRows;
  const totalPages = searchRows ? Math.max(1, Math.ceil(searchTotal / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Schools"
        description="Your pioneer campuses, school discovery, and per-campus detail."
      />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}

      {/* Search */}
      <AdminCard>
        <AdminCardHeader
          title="Find a school"
          description="Search every school in the registry by name or tag — including campuses with no users yet. Search never changes a school's permissions."
        />
        <form className="space-y-3 p-5" onSubmit={submitSearch}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <AdminInput
              aria-label="Search schools"
              placeholder="Search by school name or tag, e.g. Nsukka or unn"
              value={query}
              maxLength={150}
              onChange={(event) => setQuery(event.target.value)}
            />
            <AdminButton type="submit" variant="primary" disabled={searching || !query.trim()}>
              {searching ? "Searching…" : "Search"}
            </AdminButton>
            {searchRows ? (
              <AdminButton
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearchRows(null);
                  setQuery("");
                  setSubmittedQuery("");
                }}
              >
                Clear
              </AdminButton>
            ) : null}
          </div>
        </form>
      </AdminCard>

      {/* Results (default = pioneer five; search results when searched) */}
      {baseLoading || searching ? (
        <AdminLoadingRows rows={4} />
      ) : (
        <>
          <AdminCard>
            <AdminCardHeader
              title={searchRows ? `Search results (${searchTotal})` : "Pioneer campuses"}
              description={
                searchRows
                  ? `Schools matching “${submittedQuery}”. Pioneer campuses are marked.`
                  : "The five launch campuses of UniVerse. Every other school stays in the registry and is reachable through search."
              }
            />
            <AdminTableWrap>
              <thead>
                <tr>
                  <AdminTH>School</AdminTH>
                  <AdminTH>Tag</AdminTH>
                  <AdminTH>Pioneer</AdminTH>
                  {searchRows ? <AdminTH>Registered</AdminTH> : null}
                  {searchRows ? <AdminTH>Waitlisted</AdminTH> : null}
                  {searchRows ? <AdminTH>New (30d)</AdminTH> : null}
                  <AdminTH>Verification</AdminTH>
                  <AdminTH>Actions</AdminTH>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-400">
                      {searchRows
                        ? "No schools matched that search."
                        : "No pioneer campuses found — check the launch configuration."}
                    </td>
                  </tr>
                ) : (
                  list.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-slate-50/60">
                      <AdminTD className="font-medium text-slate-900">{row.name}</AdminTD>
                      <AdminTD>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                          {row.tag}
                        </span>
                      </AdminTD>
                      <AdminTD>
                        {row.isPioneer ? (
                          <AdminPill tone="success">Pioneer</AdminPill>
                        ) : (
                          <AdminPill tone="neutral">Community</AdminPill>
                        )}
                      </AdminTD>
                      {searchRows ? <AdminTD>{row.registered}</AdminTD> : null}
                      {searchRows ? <AdminTD>{row.waitlisted}</AdminTD> : null}
                      {searchRows ? <AdminTD>{row.new30d}</AdminTD> : null}
                      <AdminTD>
                        <AdminPill tone={row.verificationEnabled ? "success" : "neutral"}>
                          {row.verificationEnabled ? "enabled" : "disabled"}
                        </AdminPill>
                      </AdminTD>
                      <AdminTD>
                        <AdminButton variant="ghost" size="sm" onClick={() => openSchool(row)}>
                          {selectedId === row.id ? "Viewing" : "View"}
                        </AdminButton>
                      </AdminTD>
                    </tr>
                  ))
                )}
              </tbody>
            </AdminTableWrap>
          </AdminCard>

          {/* Pagination (search results only; pioneer list is exactly five) */}
          {searchRows ? (
            <div className="flex items-center justify-between px-1 text-sm text-slate-500">
              <span>
                Page {searchPage + 1} of {totalPages} · {searchTotal} result{searchTotal === 1 ? "" : "s"}
              </span>
              <div className="flex gap-2">
                <AdminButton
                  variant="secondary"
                  size="sm"
                  disabled={searchPage === 0 || searching}
                  onClick={() => void runSearch(submittedQuery, searchPage - 1)}
                >
                  Previous
                </AdminButton>
                <AdminButton
                  variant="secondary"
                  size="sm"
                  disabled={searchPage + 1 >= totalPages || searching}
                  onClick={() => void runSearch(submittedQuery, searchPage + 1)}
                >
                  Next
                </AdminButton>
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* Details panel */}
      {selectedId ? (
        <AdminCard>
          <AdminCardHeader
            title={selectedName ?? "School details"}
            description="Campus metrics and associated users. Counts come from live database queries."
          />
          <div className="space-y-4 p-5">
            {detailsLoading ? (
              <AdminLoadingRows rows={2} />
            ) : details ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                <MetricTile label="Registered users" value={details.registered_users} />
                <MetricTile label="Waitlisted" value={details.waitlisted_users} />
                <MetricTile label="New (30 days)" value={details.new_users_30d} />
                <MetricTile label="New (7 days)" value={details.new_users_7d} />
                <MetricTile label="Active users" value={null} hint="Not available — the platform does not track last-activity yet." />
              </div>
            ) : null}

            {/* Associated users */}
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <h3 className="text-sm font-semibold text-slate-700">
                  Associated users {userTotal > 0 ? `(${userTotal})` : ""}
                </h3>
                <AdminInput
                  aria-label="Search users in school"
                  placeholder="Search by name…"
                  value={userSearch}
                  maxLength={100}
                  onChange={(event) => {
                    setUserPage(0);
                    setUserSearch(event.target.value);
                  }}
                  className="sm:max-w-64"
                />
              </div>

              {userError ? <AdminAlert tone="error">{userError}</AdminAlert> : null}

              {usersLoading ? (
                <AdminLoadingRows rows={2} />
              ) : userRows.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {userSearch ? "No users matched that search." : "No registered users for this school yet."}
                </p>
              ) : (
                <AdminTableWrap>
                  <thead>
                    <tr>
                      <AdminTH>Name</AdminTH>
                      <AdminTH>Department</AdminTH>
                      <AdminTH>Level</AdminTH>
                      <AdminTH>Status</AdminTH>
                      <AdminTH>Joined</AdminTH>
                    </tr>
                  </thead>
                  <tbody>
                    {userRows.map((user) => (
                      <tr key={user.id}>
                        <AdminTD className="font-medium text-slate-900">
                          {user.full_name ?? "Unnamed"}
                        </AdminTD>
                        <AdminTD>{user.department ?? "—"}</AdminTD>
                        <AdminTD>{user.level ?? "—"}</AdminTD>
                        <AdminTD>
                          <div className="flex flex-wrap gap-1">
                            {user.is_verified ? <AdminPill tone="success">email</AdminPill> : null}
                            {user.student_verified ? <AdminPill tone="info">student</AdminPill> : null}
                            {user.account_status && user.account_status !== "active" ? (
                              <AdminPill tone="warning">{user.account_status}</AdminPill>
                            ) : null}
                          </div>
                        </AdminTD>
                        <AdminTD className="whitespace-nowrap text-xs text-slate-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </AdminTD>
                      </tr>
                    ))}
                  </tbody>
                </AdminTableWrap>
              )}

              {userTotal > PAGE_SIZE ? (
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>
                    Page {userPage + 1} of {Math.ceil(userTotal / PAGE_SIZE)}
                  </span>
                  <div className="flex gap-2">
                    <AdminButton variant="secondary" size="sm" disabled={userPage === 0 || usersLoading} onClick={() => setUserPage(userPage - 1)}>
                      Previous
                    </AdminButton>
                    <AdminButton
                      variant="secondary"
                      size="sm"
                      disabled={(userPage + 1) * PAGE_SIZE >= userTotal || usersLoading}
                      onClick={() => setUserPage(userPage + 1)}
                    >
                      Next
                    </AdminButton>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </AdminCard>
      ) : null}

      {/* Manage tools (super admin; collapsed by default) */}
      <AdminCard>
        <AdminCardHeader
          title="Manage schools"
          description="Create a school or assign a campus admin. Super admin only."
        />
        <div className="p-5">
          <AdminButton variant="secondary" onClick={() => setManageOpen(!manageOpen)}>
            {manageOpen ? "Hide tools" : "Show tools"}
          </AdminButton>
          {manageOpen ? (
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add school</p>
                <form className="space-y-3" onSubmit={saveSchool}>
                  <AdminInput
                    aria-label="School name"
                    placeholder="e.g. University of Nigeria, Nsukka"
                    value={name}
                    maxLength={150}
                    onChange={(event) => setName(event.target.value)}
                  />
                  <AdminInput
                    aria-label="School tag"
                    placeholder="Short identifier, e.g. unn"
                    value={tag}
                    maxLength={50}
                    onChange={(event) => setTag(event.target.value)}
                  />
                  <AdminButton type="submit" variant="primary" className="w-full" disabled={busy}>
                    {busy ? "Saving…" : "Create school"}
                  </AdminButton>
                </form>
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Campus admin assignment</p>
                <form className="space-y-3" onSubmit={assignAdmin}>
                  <AdminInput
                    aria-label="User ID"
                    placeholder="User UUID"
                    value={adminUserId}
                    onChange={(event) => setAdminUserId(event.target.value)}
                  />
                  <p className="text-[11px] text-slate-400">
                    Easier: open Users → Manage → “Campus admin” to grant access by search, no UUID needed.
                  </p>
                  <AdminSelect
                    aria-label="School"
                    value={adminSchoolId}
                    onChange={(event) => setAdminSchoolId(event.target.value)}
                  >
                    <option value="">Select school…</option>
                    {allSchools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </AdminSelect>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={adminEnabled}
                      onChange={(event) => setAdminEnabled(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Grant campus admin (uncheck to revoke)
                  </label>
                  <AdminButton type="submit" variant="primary" className="w-full" disabled={busy}>
                    {busy ? "Working…" : adminEnabled ? "Assign" : "Revoke"}
                  </AdminButton>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      </AdminCard>
    </div>
  );
}

function MetricTile({ label, value, hint }: { label: string; value: number | null; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      {value === null ? (
        <>
          <p className="mt-1 text-sm font-semibold text-slate-400">Not available</p>
          {hint ? <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p> : null}
        </>
      ) : (
        <p className="mt-1 font-display text-xl font-bold text-slate-900">{value}</p>
      )}
    </div>
  );
}
