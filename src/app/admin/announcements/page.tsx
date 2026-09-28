"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { publishAdminAnnouncement } from "@/services/admin/admin.service";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminInput,
  AdminPageHeader,
  AdminTextarea,
} from "@/components/admin/ui";

export default function AdminAnnouncementsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await publishAdminAnnouncement(createClient(), "platform", title.trim(), body.trim());
      setMessage(`Announcement published to all students.`);
      setTitle("");
      setBody("");
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Unable to publish announcement.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Announcements"
        description="Platform-wide announcements shown to every student."
      />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}

      <AdminCard className="max-w-2xl">
        <AdminCardHeader
          title="Publish announcement"
          description="Delivered through the platform notification system. Every publish is audit-logged."
        />
        <form className="space-y-3 p-5" onSubmit={publish}>
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
          <AdminButton type="submit" variant="primary" disabled={busy || !title.trim() || !body.trim()}>
            {busy ? "Publishing…" : "Publish announcement"}
          </AdminButton>
        </form>
      </AdminCard>

      <AdminAlert tone="neutral">
        Targeted delivery (specific university, campus, or user segments) and scheduled sends are
        not supported by the current backend. They will be added when their schema change is
        approved — no placeholder options are shown.
      </AdminAlert>
    </div>
  );
}
