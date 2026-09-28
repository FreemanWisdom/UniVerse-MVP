"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminAuditEntry } from "@/features/admin/admin.types";
import { getAdminAuditLog } from "@/services/admin/admin.service";
import {
  AdminAlert,
  AdminCard,
  AdminCardHeader,
  AdminEmptyState,
  AdminInput,
  AdminLoadingRows,
  AdminPageHeader,
  AdminPill,
  AdminSearchBar,
  AdminTableWrap,
  AdminTD,
  AdminTH,
} from "@/components/admin/ui";

/**
 * Security → Audit Logs. Append-only view of admin.audit_log via the existing
 * admin_get_audit_log RPC. No write access exists for anyone through this page
 * or its service layer.
 */
export default function AdminAuditLogsPage() {
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        setEntries(await getAdminAuditLog(createClient(), 500));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load audit log.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) =>
      [entry.action, entry.admin_name, entry.target_type, entry.target_id, entry.result]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [entries, search]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Audit Logs"
        description="Every consequential administrative action, recorded server-side."
      />

      <AdminSearchBar
        label="Search audit log"
        placeholder="Search by action, admin, target, or result…"
        value={search}
        onChange={setSearch}
      />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}

      {loading ? (
        <AdminLoadingRows rows={5} />
      ) : filtered.length === 0 ? (
        <AdminCard>
          <AdminEmptyState
            title="No audit entries matched"
            description="Try a different action, admin name, or clear the search."
          />
        </AdminCard>
      ) : (
        <AdminCard>
          <AdminCardHeader
            title={`${filtered.length} entr${filtered.length === 1 ? "y" : "ies"}`}
            description="Most recent first. The audit log is append-only and cannot be edited from this console."
          />
          <AdminTableWrap>
            <thead>
              <tr>
                <AdminTH>When</AdminTH>
                <AdminTH>Admin</AdminTH>
                <AdminTH>Action</AdminTH>
                <AdminTH>Target</AdminTH>
                <AdminTH>Result</AdminTH>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, index) => (
                <tr key={`${entry.created_at}-${entry.admin_id ?? "system"}-${index}`} className="transition-colors hover:bg-slate-50/60">
                  <AdminTD className="whitespace-nowrap text-xs text-slate-500">
                    {new Date(entry.created_at).toLocaleString()}
                  </AdminTD>
                  <AdminTD className="max-w-40 truncate">{entry.admin_name ?? entry.admin_id?.slice(0, 8) ?? "System"}</AdminTD>
                  <AdminTD>
                    <span className="font-mono text-xs font-medium text-slate-800">{entry.action}</span>
                    {entry.context && Object.keys(entry.context).length > 0 ? (
                      <details className="mt-0.5">
                        <summary className="cursor-pointer text-[10px] text-slate-400">metadata</summary>
                        <pre className="mt-1 max-w-72 overflow-x-auto rounded bg-slate-50 p-2 text-[10px] leading-relaxed text-slate-600">
                          {JSON.stringify(entry.context, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </AdminTD>
                  <AdminTD className="text-xs">
                    {entry.target_type ?? "—"}
                    {entry.target_id ? <span className="block text-slate-400">{entry.target_id.slice(0, 8)}</span> : null}
                  </AdminTD>
                  <AdminTD>
                    <AdminPill tone={entry.result === "success" ? "success" : entry.result === "accepted" ? "info" : "danger"}>
                      {entry.result}
                    </AdminPill>
                  </AdminTD>
                </tr>
              ))}
            </tbody>
          </AdminTableWrap>
        </AdminCard>
      )}
    </div>
  );
}
