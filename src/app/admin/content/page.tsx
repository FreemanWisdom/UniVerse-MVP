"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
      setMessage(`${action} applied.`);
      await loadRows(resource, search);
    } catch (moderateError) {
      setError(moderateError instanceof Error ? moderateError.message : "The moderation action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Content</h1>
        <p className="text-sm text-slate-400">Browse and moderate content across every surface.</p>
      </div>

      {counts ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(counts).map(([key, count]) => (
            <div key={key} className="rounded-lg border border-surface-200 bg-surface-50 p-3">
              <p className="text-[11px] text-slate-500">{key.replace(/_/g, " ")}</p>
              <p className="text-lg font-semibold text-foreground">{count}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {RESOURCES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setResource(key);
              setSearch("");
            }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              resource === key
                ? "border-campus-500 bg-campus-500/10 text-campus-400"
                : "border-surface-300 bg-surface-100 text-slate-300 hover:border-campus-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void loadRows(resource, search);
        }}
      >
        <Input
          aria-label="Search content"
          placeholder="Search this content type…"
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
        <p className="text-sm text-slate-400" aria-live="polite">Loading…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-400">Nothing found.</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <Card key={String(row.id)}>
              <CardContent className="space-y-2 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-200">
                      {row.content ?? row.title ?? row.name ?? String(row.id).slice(0, 8)}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {resource === "orbit" ? (row.poster_name ?? "unknown") : null}
                      {resource === "chat" ? `sender ${row.sender_id?.slice(0, 8) ?? "—"} · ${row.conversation_id?.slice(0, 8) ?? "—"}` : null}
                      {resource === "study" ? `${row.title ?? ""} · ${row.course_code ?? ""} · ${row.resource_type ?? ""}` : null}
                      {resource === "tribe" ? `${row.name ?? ""} · ${row.university ?? ""}` : null}
                      {" · "}
                      <span className={row.moderation_status === "active" ? "text-campus-400" : "text-amber-400"}>
                        {row.moderation_status}
                      </span>
                      {" · "}
                      {formatOrbitTime(row.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {(ACTIONS[resource] ?? []).map((action) => (
                      <button
                        key={action}
                        type="button"
                        disabled={busy}
                        onClick={() => void moderate(row, action)}
                        className="rounded-lg border border-surface-300 bg-surface-100 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-campus-500 disabled:opacity-50"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
