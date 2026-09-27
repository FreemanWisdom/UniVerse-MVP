"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatOrbitTime } from "@/features/orbit/orbit.utils";
import {
  AdminContentCounts,
  AdminContentResource,
  AdminContentRow,
} from "@/features/admin/admin.types";
import {
  getAdminContent,
  listAdminContentCounts,
  moderateAdminContent,
} from "@/services/admin/admin.service";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminLoadingRows,
  AdminPageHeader,
  AdminPill,
  AdminSearchBar,
  AdminSegmented,
} from "@/components/admin/ui";

const RESOURCES: Array<{ key: AdminContentResource; label: string }> = [
  { key: "orbit", label: "Orbit posts" },
  { key: "chat", label: "Chat messages" },
  { key: "study", label: "Study resources" },
  { key: "tribe", label: "Tribes" },
];

const ACTIONS: Record<string, Array<"hide" | "remove" | "restore" | "approve" | "reject">> = {
  orbit: ["hide", "remove", "restore"],
  chat: ["hide", "remove", "restore"],
  study: ["approve", "reject", "remove", "restore"],
  tribe: ["hide", "remove", "restore"],
};

const ACTION_VARIANTS: Record<string, "secondary" | "dangerSoft" | "primary"> = {
  hide: "secondary",
  remove: "dangerSoft",
  restore: "primary",
  approve: "primary",
  reject: "dangerSoft",
};

function moderationTone(status?: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "pending") return "warning";
  if (status === "removed" || status === "rejected") return "danger";
  return "neutral";
}

export default function AdminContentPage() {
  const [counts, setCounts] = useState<AdminContentCounts | null>(null);
  const [resource, setResource] = useState<AdminContentResource>("orbit");
  const [rows, setRows] = useState<AdminContentRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        setCounts(await listAdminContentCounts(createClient()));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load counts.");
      }
    });
  }, []);

  const loadRows = async (resourceKey: AdminContentResource, searchValue: string) => {
    setLoading(true);
    setError(null);
    try {
      const trimmed = searchValue.trim();
      setRows(await getAdminContent(createClient(), resourceKey, trimmed ? trimmed : null));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load content.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => void loadRows(resource, ""));
  }, [resource]);

  const moderate = async (row: AdminContentRow, action: "hide" | "remove" | "restore" | "approve" | "reject") => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await moderateAdminContent(createClient(), resource, String(row.id), action);
      setMessage(`Action applied: ${action}.`);
      await loadRows(resource, search);
    } catch (moderateError) {
      setError(moderateError instanceof Error ? moderateError.message : "The moderation action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Content" description="Browse and moderate content across every surface." />

      {counts ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(counts).map(([key, count]) => (
            <AdminCard key={key} className="px-4 py-3">
              <p className="text-xs capitalize text-slate-500">{key.replace(/_/g, " ")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{count}</p>
            </AdminCard>
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        <AdminSegmented
          ariaLabel="Content type"
          items={RESOURCES.map(({ key, label }) => ({
            key,
            label,
            count: counts ? counts[key as keyof AdminContentCounts] : undefined,
          }))}
          active={resource}
          onSelect={(key) => {
            setResource(key as AdminContentResource);
            setSearch("");
          }}
        />
        <AdminSearchBar
          label="Search content"
          placeholder="Search this content type…"
          value={search}
          onChange={setSearch}
          onSubmit={() => void loadRows(resource, search)}
          busy={busy}
        />
      </div>

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}

      {loading ? (
        <AdminLoadingRows rows={4} />
      ) : rows.length === 0 ? (
        <AdminCard>
          <AdminEmptyState title="Nothing found" description="No content matched this view or search." />
        </AdminCard>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) => (
            <AdminCard key={String(row.id)} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {row.content ?? row.title ?? row.name ?? String(row.id).slice(0, 8)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    {resource === "orbit" ? <span>by {row.poster_name ?? "unknown"}</span> : null}
                    {resource === "chat" ? (
                      <span>
                        sender {row.sender_id?.slice(0, 8) ?? "—"} · conversation {row.conversation_id?.slice(0, 8) ?? "—"}
                      </span>
                    ) : null}
                    {resource === "study" ? (
                      <span>
                        {row.title ?? ""} · {row.course_code ?? ""} · {row.resource_type ?? ""}
                      </span>
                    ) : null}
                    {resource === "tribe" ? (
                      <span>
                        {row.name ?? ""} · {row.university ?? ""}
                      </span>
                    ) : null}
                    <AdminPill tone={moderationTone(row.moderation_status)}>{row.moderation_status}</AdminPill>
                    <span>{formatOrbitTime(row.created_at)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  {(ACTIONS[resource] ?? []).map((action) => (
                    <AdminButton
                      key={action}
                      variant={ACTION_VARIANTS[action] ?? "secondary"}
                      size="sm"
                      disabled={busy}
                      onClick={() => void moderate(row, action)}
                      className="capitalize"
                    >
                      {action}
                    </AdminButton>
                  ))}
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
}
