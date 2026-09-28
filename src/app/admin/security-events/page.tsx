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
  AdminLoadingRows,
  AdminPageHeader,
  AdminPill,
  AdminSearchBar,
  AdminTableWrap,
  AdminTD,
  AdminTH,
} from "@/components/admin/ui";

/**
 * Security Events — a FILTERED VIEW of the existing administrative audit log.
 *
 * Honest scope: this is NOT a dedicated security telemetry system. There is no
 * failed-login counter, IP intelligence, device risk, or intrusion detection
 * today. This page surfaces security-relevant entries that the audit log
 * already records: account suspensions/bans/restrictions, verification
 * changes, lockdown, admin grants, campus-admin assignment, and feature flags.
 */
const SECURITY_ACTION_PATTERNS = [
  "user_",
  "lockdown",
  "campus_admin",
  "console_member",
  "role",
  "flag",
  "import",
];

function isSecurityRelevant(action: string): boolean {
  const normalized = action.toLowerCase();
  return SECURITY_ACTION_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export default function AdminSecurityEventsPage() {
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        setEntries(await getAdminAuditLog(createClient(), 500));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load security events.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const filtered = useMemo(() => {
    const securityEntries = entries.filter((entry) => isSecurityRelevant(entry.action));
    const needle = search.trim().toLowerCase();
    if (!needle) return securityEntries;
    return securityEntries.filter((entry) =>
      [entry.action, entry.admin_name, entry.target_id, entry.result]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [entries, search]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Security Events"
        description="Security-relevant administrative events."
      />

      <AdminAlert tone="neutral">
        Security Events currently represents security-relevant entries recorded in the
        administrative audit log — account status changes, verification changes, lockdowns, admin
        grants, and platform configuration. Dedicated security telemetry (failed logins, session
        revocations, device intelligence) does not exist yet and is not fabricated here.
      </AdminAlert>

      <AdminSearchBar
        label="Search security events"
        placeholder="Search by action, admin, or target…"
        value={search}
        onChange={setSearch}
      />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}

      {loading ? (
        <AdminLoadingRows rows={4} />
      ) : filtered.length === 0 ? (
        <AdminCard>
          <AdminEmptyState
            title="No security-relevant events"
            description="No account suspensions, lockdowns, role changes, or configuration changes are recorded."
          />
        </AdminCard>
      ) : (
        <AdminCard>
          <AdminCardHeader
            title={`${filtered.length} event${filtered.length === 1 ? "" : "s"}`}
            description="Filtered from the append-only audit log. Most recent first."
          />
          <AdminTableWrap>
            <thead>
              <tr>
                <AdminTH>When</AdminTH>
                <AdminTH>Admin</AdminTH>
                <AdminTH>Event</AdminTH>
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
                  </AdminTD>
                  <AdminTD className="text-xs">
                    {entry.target_type ?? "—"}
                    {entry.target_id ? <span className="block text-slate-400">{entry.target_id.slice(0, 8)}</span> : null}
                  </AdminTD>
                  <AdminTD>
                    <AdminPill tone={entry.result === "success" || entry.result === "accepted" ? "success" : "danger"}>
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
