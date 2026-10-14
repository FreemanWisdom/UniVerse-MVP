import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Campus Ambassador client.
 *
 * All authorization is server-side: every RPC here re-verifies the caller's
 * active campus_ambassador membership AND that the school matches their own
 * profile.university (sql/ambassador-program.sql). The UI gate is cosmetic
 * only. Ambassadors see metadata and counts — never message bodies, whisper
 * text, or author/reporter identities — and can only escalate, never
 * moderate, ban, or message.
 */

export interface AmbassadorScope {
  school_id: string;
  school_name: string;
}

export interface AmbassadorCampusStats {
  school_name: string;
  students: number;
  pending_reports: number;
  orbit_posts_24h: number;
  orbit_posts_7d: number;
}

export interface AmbassadorReportRow {
  id: string;
  content_type: string;
  reason: string;
  status: string;
  created_at: string;
}

/** The caller's ambassador campus, or null when they are not an ambassador. */
export async function getAmbassadorScope(
  supabase: SupabaseClient
): Promise<AmbassadorScope | null> {
  const { data, error } = await supabase.rpc("ambassador_get_scope");
  if (error) {
    throw new Error(`Unable to check ambassador status: ${error.message}`);
  }
  return (data as AmbassadorScope | null) ?? null;
}

export async function getCampusStats(
  supabase: SupabaseClient
): Promise<AmbassadorCampusStats> {
  const { data, error } = await supabase.rpc("ambassador_get_campus_stats");
  if (error) {
    throw new Error(escalateFriendly(error.message));
  }
  return data as AmbassadorCampusStats;
}

export async function listCampusReports(
  supabase: SupabaseClient
): Promise<AmbassadorReportRow[]> {
  const { data, error } = await supabase.rpc("ambassador_list_reports");
  if (error) {
    throw new Error(escalateFriendly(error.message));
  }
  return (data ?? []) as AmbassadorReportRow[];
}

export async function escalateCampusReport(
  supabase: SupabaseClient,
  reportId: string,
  note: string | null
): Promise<{ ok: boolean; already_escalated: boolean }> {
  const { data, error } = await supabase.rpc("ambassador_escalate_report", {
    p_report_id: reportId,
    p_note: note,
  });
  if (error) {
    throw new Error(escalateFriendly(error.message));
  }
  return data as { ok: boolean; already_escalated: boolean };
}

/** Maps ambassador RPC error codes to friendly copy. */
function escalateFriendly(message: string): string {
  if (message.includes("ambassador_access_required")) {
    return "This area is only for campus ambassadors. Your access may have changed — reload the page.";
  }
  if (message.includes("report_outside_scope")) {
    return "That report is outside your campus.";
  }
  if (message.includes("report_already_resolved")) {
    return "That report was already handled by the moderation team.";
  }
  if (message.includes("report_not_found")) {
    return "That report no longer exists.";
  }
  if (message.includes("rate_limit_exceeded")) {
    return "You have escalated a lot already — please wait a while before escalating more.";
  }
  if (message.includes("not_authenticated")) {
    return "Your session expired — sign in again.";
  }
  return message || "Something went wrong.";
}
