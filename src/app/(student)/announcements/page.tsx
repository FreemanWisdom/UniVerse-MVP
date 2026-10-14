"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { formatOrbitTime } from "@/features/orbit/orbit.utils";
import {
  fetchActiveAnnouncements,
  StudentAnnouncement,
} from "@/services/announcements/student.service";

function scopeBadge(scope: string) {
  if (scope === "global" || scope === "platform") {
    return <Badge variant="secondary">For everyone</Badge>;
  }
  // campus:<exact schools.name> — the exact name is the caller's own campus
  return <Badge variant="default">For your campus</Badge>;
}

export default function AnnouncementsPage() {
  const [rows, setRows] = useState<StudentAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  // No synchronous setState inside the effect (project lint rule):
  // loading starts true and error starts null, so the first render is the
  // loading state and state only changes after the fetch settles.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = createClient();
      try {
        const announcements = await fetchActiveAnnouncements(supabase);
        if (!cancelled) setRows(announcements);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load announcements."
          );
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

  const retry = async () => {
    setRetrying(true);
    try {
      const supabase = createClient();
      const announcements = await fetchActiveAnnouncements(supabase);
      setRows(announcements);
      setError(null);
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Unable to load announcements.");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="space-y-4 px-2 py-2 sm:px-0">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Announcements
        </h1>
        <p className="text-sm text-slate-400">
          Official updates from the UniVerse team and your campus desk.
        </p>
      </header>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading announcements">
          {[0, 1, 2].map((i) => (
            <Card key={i} aria-hidden="true">
              <CardContent className="space-y-2 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-surface-200" />
                <div className="h-3 w-full animate-pulse rounded bg-surface-200" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-surface-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="text-sm text-foreground">{error}</p>
            <Button onClick={retry} disabled={retrying}>
              {retrying ? "Retrying…" : "Try again"}
            </Button>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 p-6 text-center">
            <p className="font-medium text-foreground">No announcements yet</p>
            <p className="text-sm text-slate-400">
              When your campus or the UniVerse team posts an update, it will show up
              here first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id} aria-label={`Announcement: ${row.title}`}>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {scopeBadge(row.scope)}
                  <span className="text-xs text-slate-400">
                    {formatOrbitTime(row.published_at)}
                  </span>
                </div>
                <h2 className="font-semibold text-foreground">{row.title}</h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                  {row.body}
                </p>
                <p className="text-xs text-slate-500">
                  From {row.display_name ?? "UniVerse Team"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
