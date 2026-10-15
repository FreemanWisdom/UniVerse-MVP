"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { listSurveyResponses, SurveyResponseRow } from "@/services/admin/admin.service";
import {
  AdminAlert,
  AdminCard,
  AdminEmptyState,
  AdminLoadingRows,
  AdminPageHeader,
  AdminPill,
  AdminTD,
  AdminTH,
  AdminTableWrap,
  AdminButton,
} from "@/components/admin/ui";
import { formatOrbitTime } from "@/features/orbit/orbit.utils";

/**
 * Surveys — read-only view of student feedback responses
 * (admin_list_survey_responses is admin-gated and returns only safe fields:
 * display name, campus, answers, timestamps — never emails or auth IDs).
 * Campus search + pagination run SQL-side.
 */
export default function AdminSurveysPage() {
  const [rows, setRows] = useState<SurveyResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const PAGE = 20;

  const fetchPage = useCallback(
    async (nextOffset: number, searchQuery: string): Promise<SurveyResponseRow[]> => {
      const result = await listSurveyResponses(createClient(), searchQuery, PAGE, nextOffset);
      return result;
    },
    []
  );

  // Search change / first load: reset to page 1. All setStates sit behind
  // the first await (project lint: no synchronous setState in effects).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPage(0, search);
        if (cancelled) return;
        setRows(result);
        setOffset(result.length);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Failed to load survey responses."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage, search]);

  const loadMore = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPage(offset, search);
      setRows((prev) => [...prev, ...result]);
      setOffset(offset + result.length);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load more responses.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Surveys"
        description="Student feedback responses — what your campus is telling you."
      />

      {error && <AdminAlert tone="error">{error}</AdminAlert>}

      <AdminCard>
        <form
          className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
            placeholder="Search by campus name (e.g. Nsukka)"
            aria-label="Search by campus"
          />
          <AdminButton type="submit" size="sm" disabled={loading}>
            Search
          </AdminButton>
        </form>

        {loading && rows.length === 0 ? (
          <AdminLoadingRows />
        ) : rows.length === 0 ? (
          <AdminEmptyState
            title="No survey responses yet"
            description="Responses appear here once students submit the feedback survey from Settings."
          />
        ) : (
          <AdminTableWrap>
            <thead>
              <tr>
                <AdminTH>Student</AdminTH>
                <AdminTH>Campus</AdminTH>
                <AdminTH>Answers</AdminTH>
                <AdminTH>Submitted</AdminTH>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                >
                  <AdminTD className="font-medium text-slate-900">{row.display_name}</AdminTD>
                  <AdminTD>
                    <AdminPill>{row.campus}</AdminPill>
                  </AdminTD>
                  <AdminTD className="max-w-[280px] truncate text-xs text-slate-500">
                    {expanded === row.id
                      ? Object.entries(row.answers)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(" · ")
                      : Object.entries(row.answers)
                          .slice(0, 2)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(" · ")}
                  </AdminTD>
                  <AdminTD className="whitespace-nowrap text-xs text-slate-500">
                    {formatOrbitTime(row.submitted_at)}
                  </AdminTD>
                </tr>
              ))}
            </tbody>
          </AdminTableWrap>
        )}

        {offset > 0 && rows.length === offset && (
          <div className="border-t border-slate-100 p-4 text-center">
            <AdminButton
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => void loadMore()}
            >
              {loading ? "Loading…" : "Load more"}
            </AdminButton>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
