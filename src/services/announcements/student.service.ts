import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Student-facing announcements.
 *
 * Reads go through the SECURITY DEFINER RPC `get_active_announcements()`
 * (sql/announcements-student-read.sql): campus scope is computed
 * server-side from the caller's profile and `published_by` is never
 * returned. There is no client grant on admin.announcements and none is
 * needed.
 */

export interface StudentAnnouncement {
  id: string;
  title: string;
  body: string;
  /** 'global' (or legacy 'platform') or 'campus:<schools.name>' */
  scope: string;
  attribution_mode: "official" | "pseudonymous";
  display_name: string | null;
  published_at: string;
}

/** Lists announcements visible to the signed-in student (global + own campus). */
export async function fetchActiveAnnouncements(
  supabase: SupabaseClient
): Promise<StudentAnnouncement[]> {
  const { data, error } = await supabase.rpc("get_active_announcements");
  if (error) {
    throw new Error(`Unable to load announcements: ${error.message}`);
  }
  return (data ?? []) as StudentAnnouncement[];
}
