"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminSchool } from "@/features/admin/admin.types";
import { listAdminSchools, setCampusAdmin, upsertAdminSchool } from "@/services/admin/admin.service";
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

export default function AdminSchoolsPage() {
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [adminUserId, setAdminUserId] = useState("");
  const [adminSchoolId, setAdminSchoolId] = useState("");
  const [adminEnabled, setAdminEnabled] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setSchools(await listAdminSchools(createClient()));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load schools.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);

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
      await load();
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

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Schools" description="Campuses, their registries, and campus administrators." />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}

      {loading ? (
        <AdminLoadingRows rows={3} />
      ) : (
        <AdminTableWrap>
          <thead>
            <tr>
              <AdminTH>School</AdminTH>
              <AdminTH>Tag</AdminTH>
              <AdminTH>Registry students</AdminTH>
              <AdminTH>Verification</AdminTH>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => (
              <tr key={school.id} className="transition-colors hover:bg-slate-50/60">
                <AdminTD className="font-medium text-slate-900">{school.name}</AdminTD>
                <AdminTD>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                    {school.tag}
                  </span>
                </AdminTD>
                <AdminTD>{school.student_count}</AdminTD>
                <AdminTD>
                  <AdminPill tone={school.verification_enabled ? "success" : "neutral"}>
                    {school.verification_enabled ? "enabled" : "disabled"}
                  </AdminPill>
                </AdminTD>
              </tr>
            ))}
          </tbody>
        </AdminTableWrap>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard>
          <AdminCardHeader title="Add school" description="Super admin only." />
          <form className="space-y-3 p-5" onSubmit={saveSchool}>
            <div className="space-y-1.5">
              <label htmlFor="school-name" className="text-xs font-medium text-slate-600">
                School name
              </label>
              <AdminInput
                id="school-name"
                aria-label="School name"
                placeholder="e.g. University of Nigeria, Nsukka"
                value={name}
                maxLength={150}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="school-tag" className="text-xs font-medium text-slate-600">
                Tag
              </label>
              <AdminInput
                id="school-tag"
                aria-label="School tag"
                placeholder="Short identifier, e.g. unn"
                value={tag}
                maxLength={50}
                onChange={(event) => setTag(event.target.value)}
              />
            </div>
            <AdminButton type="submit" variant="primary" className="w-full" disabled={busy}>
              {busy ? "Saving…" : "Create school"}
            </AdminButton>
          </form>
        </AdminCard>

        <AdminCard>
          <AdminCardHeader title="Campus admin assignment" description="Grant or revoke admin rights for one campus. Super admin only." />
          <form className="space-y-3 p-5" onSubmit={assignAdmin}>
            <div className="space-y-1.5">
              <label htmlFor="campus-admin-user" className="text-xs font-medium text-slate-600">
                User ID
              </label>
              <AdminInput
                id="campus-admin-user"
                aria-label="User ID"
                placeholder="User UUID"
                value={adminUserId}
                onChange={(event) => setAdminUserId(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="campus-admin-school" className="text-xs font-medium text-slate-600">
                School
              </label>
              <AdminSelect
                id="campus-admin-school"
                aria-label="School"
                value={adminSchoolId}
                onChange={(event) => setAdminSchoolId(event.target.value)}
              >
                <option value="">Select school…</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </AdminSelect>
            </div>
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
        </AdminCard>
      </div>
    </div>
  );
}
