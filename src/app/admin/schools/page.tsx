"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { AdminSchool } from "@/features/admin/admin.types";
import { listAdminSchools, setCampusAdmin, upsertAdminSchool } from "@/services/admin/admin.service";

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Schools</h1>
        <p className="text-sm text-slate-400">Campuses, their registries, and campus admins.</p>
      </div>

      {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}
      {message ? <p className="text-sm text-campus-400" role="status">{message}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-400" aria-live="polite">Loading schools…</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-200 text-xs text-slate-500">
                    <th className="p-3">School</th>
                    <th className="p-3">Tag</th>
                    <th className="p-3">Registry students</th>
                    <th className="p-3">Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school) => (
                    <tr key={school.id} className="border-b border-surface-200/60">
                      <td className="p-3 text-slate-200">{school.name}</td>
                      <td className="p-3 font-mono text-xs text-slate-400">{school.tag}</td>
                      <td className="p-3 text-slate-300">{school.student_count}</td>
                      <td className="p-3">
                        <span className={school.verification_enabled ? "text-campus-400" : "text-slate-500"}>
                          {school.verification_enabled ? "enabled" : "disabled"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Add school (super admin)</p>
            <form className="space-y-3" onSubmit={saveSchool}>
              <Input
                aria-label="School name"
                placeholder="School name"
                value={name}
                maxLength={150}
                onChange={(event) => setName(event.target.value)}
              />
              <Input
                aria-label="School tag"
                placeholder="Slug / tag (e.g. unn)"
                value={tag}
                maxLength={50}
                onChange={(event) => setTag(event.target.value)}
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg border border-surface-300 bg-surface-100 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-campus-500 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Create school"}
              </button>
              <p className="text-[11px] text-slate-500">
                Editing an existing school&#39;s name or tag requires its UUID; ask if you need it wired up.
              </p>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Campus admin assignment (super admin)</p>
            <form className="space-y-3" onSubmit={assignAdmin}>
              <Input
                aria-label="User ID"
                placeholder="User UUID"
                value={adminUserId}
                onChange={(event) => setAdminUserId(event.target.value)}
              />
              <select
                aria-label="School"
                value={adminSchoolId}
                onChange={(event) => setAdminSchoolId(event.target.value)}
                className="w-full rounded-lg border border-surface-300 bg-surface-50 p-2 text-sm text-foreground"
              >
                <option value="">Select school…</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={adminEnabled}
                  onChange={(event) => setAdminEnabled(event.target.checked)}
                />
                Grant campus admin (uncheck to revoke)
              </label>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg border border-surface-300 bg-surface-100 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-campus-500 disabled:opacity-50"
              >
                {busy ? "Working…" : adminEnabled ? "Assign" : "Revoke"}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
