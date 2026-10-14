"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  publishAdminAnnouncement,
  listAdminSchools,
  AnnouncementAttributionMode,
} from "@/services/admin/admin.service";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/ui";

type ScopeMode = "global" | "campus";

/** Maps server error codes from admin_publish_announcement to friendly copy. */
function publishErrorMessage(message: string): string {
  if (message.includes("unknown_campus_scope")) {
    return "That campus is not in the registry. Pick a campus from the list.";
  }
  if (message.includes("invalid_announcement_scope")) {
    return "Choose a valid audience: everyone, or a specific campus.";
  }
  if (message.includes("display_name_required")) {
    return "Pseudonymous announcements need a public byline students will see.";
  }
  if (message.includes("invalid_attribution_mode")) {
    return "Choose a valid attribution: official or pseudonymous.";
  }
  if (message.includes("admin_access_required")) {
    return "Your account does not have permission to publish announcements.";
  }
  return message || "Unable to publish announcement.";
}

export default function AdminAnnouncementsPage() {
  const [scopeMode, setScopeMode] = useState<ScopeMode>("global");
  const [schoolName, setSchoolName] = useState("");
  const [schools, setSchools] = useState<string[]>([]);
  const [attributionMode, setAttributionMode] = useState<AnnouncementAttributionMode>("official");
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAdminSchools(createClient())
      .then((rows) => {
        if (!cancelled) setSchools(rows.map((row) => row.name).sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {
        // Campus targeting stays unusable until the school list loads;
        // the form shows an explicit hint instead of failing silently.
        if (!cancelled) setSchools([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const scopeValue = scopeMode === "global" ? "global" : `campus:${schoolName}`;

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await publishAdminAnnouncement(
        createClient(),
        scopeValue,
        title.trim(),
        body.trim(),
        attributionMode,
        attributionMode === "pseudonymous" ? displayName.trim() : null
      );
      setMessage(
        scopeMode === "global"
          ? "Announcement published to every student."
          : `Announcement published to students at ${schoolName}.`
      );
      setTitle("");
      setBody("");
      setDisplayName("");
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishErrorMessage(publishError.message)
          : "Unable to publish announcement."
      );
    } finally {
      setBusy(false);
    }
  };

  const formValid =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (scopeMode === "global" || schoolName.length > 0) &&
    (attributionMode === "official" || displayName.trim().length > 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Announcements"
        description="Platform-wide and campus-targeted announcements. Students see them on the Announcements page; scope is enforced server-side."
      />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}

      <AdminCard className="max-w-2xl">
        <AdminCardHeader
          title="Publish announcement"
          description="Every publish is audit-logged with its scope and attribution. Students never see the publishing account."
        />
        <form className="space-y-3 p-5" onSubmit={publish}>
          <AdminSelect
            aria-label="Audience"
            value={scopeMode}
            onChange={(event) => setScopeMode(event.target.value as ScopeMode)}
          >
            <option value="global">Everyone (all campuses)</option>
            <option value="campus">One campus</option>
          </AdminSelect>

          {scopeMode === "campus" ? (
            schools.length > 0 ? (
              <AdminSelect
                aria-label="Campus"
                value={schoolName}
                onChange={(event) => setSchoolName(event.target.value)}
              >
                <option value="">Select a campus…</option>
                {schools.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </AdminSelect>
            ) : (
              <AdminAlert tone="neutral">
                Campus list is unavailable right now. You can still publish to everyone.
              </AdminAlert>
            )
          ) : null}

          <AdminInput
            aria-label="Announcement title"
            placeholder="Title"
            value={title}
            maxLength={200}
            required
            onChange={(event) => setTitle(event.target.value)}
          />
          <AdminTextarea
            aria-label="Announcement body"
            placeholder="Body"
            value={body}
            maxLength={2000}
            rows={4}
            required
            onChange={(event) => setBody(event.target.value)}
          />

          <AdminSelect
            aria-label="Attribution"
            value={attributionMode}
            onChange={(event) =>
              setAttributionMode(event.target.value as AnnouncementAttributionMode)
            }
          >
            <option value="official">Official — signed “UniVerse Team”</option>
            <option value="pseudonymous">Pseudonymous — custom byline</option>
          </AdminSelect>

          {attributionMode === "pseudonymous" ? (
            <AdminInput
              aria-label="Public byline"
              placeholder="Byline students will see (e.g. Campus Desk)"
              value={displayName}
              maxLength={80}
              required
              onChange={(event) => setDisplayName(event.target.value)}
            />
          ) : null}

          <AdminButton type="submit" variant="primary" disabled={busy || !formValid}>
            {busy ? "Publishing…" : "Publish announcement"}
          </AdminButton>
        </form>
      </AdminCard>

      <AdminAlert tone="neutral">
        Scheduled sends and user-segment targeting are not supported by the current
        backend. Students only ever see published, active announcements — drafts do
        not exist in this table.
      </AdminAlert>
    </div>
  );
}
