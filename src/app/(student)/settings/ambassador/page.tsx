"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { formatOrbitTime } from "@/features/orbit/orbit.utils";
import {
  AmbassadorCampusStats,
  AmbassadorReportRow,
  AmbassadorScope,
  escalateCampusReport,
  getAmbassadorScope,
  getCampusStats,
  listCampusReports,
} from "@/services/ambassador/ambassador.service";

const CONTENT_LABELS: Record<string, string> = {
  post: "Orbit post",
  orbit_post: "Orbit post",
  comment: "Comment",
  orbit_comment: "Comment",
  whisper: "Whisper",
};

function contentLabel(type: string): string {
  return CONTENT_LABELS[type] ?? type;
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-surface-200 bg-surface-100/70 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default function AmbassadorDashboardPage() {
  const [scope, setScope] = useState<AmbassadorScope | null>(null);
  const [stats, setStats] = useState<AmbassadorCampusStats | null>(null);
  const [reports, setReports] = useState<AmbassadorReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [gateChecked, setGateChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [messageById, setMessageById] = useState<Record<string, string>>({});

  const refresh = async () => {
    try {
      const supabase = createClient();
      const [campusStats, reportRows] = await Promise.all([
        getCampusStats(supabase),
        listCampusReports(supabase),
      ]);
      setStats(campusStats);
      setReports(reportRows);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to load your dashboard.");
    }
  };

  // No synchronous setState inside the effect (project lint rule): state
  // only changes after the first await resolves.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = createClient();
      try {
        const ambassadorScope = await getAmbassadorScope(supabase);
        if (!cancelled) {
          setScope(ambassadorScope);
          setGateChecked(true);
        }
        if (ambassadorScope) {
          const [campusStats, reportRows] = await Promise.all([
            getCampusStats(supabase),
            listCampusReports(supabase),
          ]);
          if (!cancelled) {
            setStats(campusStats);
            setReports(reportRows);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setGateChecked(true);
          setError(loadError instanceof Error ? loadError.message : "Unable to load your dashboard.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const escalate = async (reportId: string) => {
    setBusyId(reportId);
    setMessageById((prev) => ({ ...prev, [reportId]: "" }));
    try {
      const supabase = createClient();
      const result = await escalateCampusReport(supabase, reportId, noteById[reportId]?.trim() || null);
      setMessageById((prev) => ({
        ...prev,
        [reportId]: result.already_escalated
          ? "Already escalated — the moderation team has it."
          : "Escalated. The moderation team has been flagged.",
      }));
      await refresh();
    } catch (escalateError) {
      setMessageById((prev) => ({
        ...prev,
        [reportId]: escalateError instanceof Error ? escalateError.message : "Unable to escalate.",
      }));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto w-full space-y-3" role="status" aria-label="Loading ambassador dashboard">
        <div className="h-8 w-1/2 animate-pulse rounded bg-surface-200" />
        <div className="h-24 w-full animate-pulse rounded bg-surface-200" />
        <div className="h-24 w-full animate-pulse rounded bg-surface-200" />
      </div>
    );
  }

  if (gateChecked && !scope) {
    return (
      <div className="max-w-2xl mx-auto w-full">
        <Card>
          <CardContent className="space-y-2 p-6 text-center">
            <p className="font-medium text-foreground">Not available</p>
            <p className="text-sm text-slate-400">
              The campus ambassador dashboard is only available to appointed
              ambassadors. If you believe this is a mistake, contact the
              UniVerse team.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <header className="space-y-1">
        <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.25em] text-campus-400">
          Campus Ambassador
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {scope?.school_name}
        </h1>
        <p className="text-sm text-slate-400">
          Campus pulse and community reports. You can flag serious issues to
          the moderation team — you never see private content or who reported
          it.
        </p>
      </header>

      {error ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="text-sm text-foreground">{error}</p>
            <Button onClick={() => void refresh()}>Try again</Button>
          </CardContent>
        </Card>
      ) : null}

      {stats ? (
        <section aria-label="Campus stats" className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Campus pulse</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="Students" value={stats.students} />
            <StatTile label="Pending reports" value={stats.pending_reports} />
            <StatTile label="Orbit posts · 24h" value={stats.orbit_posts_24h} />
            <StatTile label="Orbit posts · 7d" value={stats.orbit_posts_7d} />
          </div>
        </section>
      ) : null}

      <section aria-label="Campus reports" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Reported content</h2>
        {reports.length === 0 ? (
          <Card>
            <CardContent className="space-y-2 p-6 text-center">
              <p className="font-medium text-foreground">No open reports</p>
              <p className="text-sm text-slate-400">
                Nothing on your campus needs attention right now.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((row) => (
              <Card key={row.id} aria-label={`Report: ${contentLabel(row.content_type)}`}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{contentLabel(row.content_type)}</Badge>
                      <Badge variant={row.status === "escalated" ? "campus" : "secondary"}>
                        {row.status === "escalated" ? "Escalated" : "Pending"}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-400">{formatOrbitTime(row.created_at)}</span>
                  </div>

                  <p className="text-sm text-slate-300">
                    Reported as <span className="text-foreground">{row.reason}</span>
                  </p>

                  {messageById[row.id] ? (
                    <p className="text-xs text-campus-400">{messageById[row.id]}</p>
                  ) : row.status === "pending" ? (
                    <div className="space-y-2">
                      <Input
                        aria-label="Note for the moderation team"
                        placeholder="Optional note for the moderation team"
                        maxLength={500}
                        value={noteById[row.id] ?? ""}
                        onChange={(event) =>
                          setNoteById((prev) => ({ ...prev, [row.id]: event.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-[36px]"
                        disabled={busyId === row.id}
                        onClick={() => void escalate(row.id)}
                      >
                        {busyId === row.id ? "Escalating…" : "Escalate to moderators"}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      The moderation team has been flagged for this report.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
