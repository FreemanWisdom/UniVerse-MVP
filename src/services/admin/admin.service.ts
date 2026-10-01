import { SupabaseClient } from "@supabase/supabase-js";
import {
  AdminAuditEntry,
  AdminBootstrap,
  AdminContentCounts,
  AdminContentResource,
  AdminContentRow,
  AdminEmergencyState,
  AdminFeatureFlag,
  AdminListedUser,
  AdminOverview,
  AdminRoleName,
  AdminUserDetail,
  AdminReport,
  AdminSchool,
  AdminSystemHealth,
  AdminUserAction,
} from "@/features/admin/admin.types";

async function rpc<T>(
  supabase: SupabaseClient,
  name: string,
  args: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    if (error.message.includes("admin_access_required")) {
      throw new Error("admin_access_required");
    }
    if (error.message.includes("super_admin_required")) {
      throw new Error("super_admin_required");
    }
    if (error.message.includes("school_scope_denied")) {
      throw new Error("school_scope_denied");
    }
    throw new Error(error.message);
  }
  return data as T;
}

/** Session gate: returns the caller's admin role, or authorized=false. */
export async function adminBootstrap(supabase: SupabaseClient): Promise<AdminBootstrap> {
  return rpc<AdminBootstrap>(supabase, "admin_bootstrap", {});
}

export async function getAdminOverview(supabase: SupabaseClient): Promise<AdminOverview> {
  return rpc<AdminOverview>(supabase, "admin_get_overview", {});
}

export interface AdminUserQuery {
  search?: string | null;
  university?: string | null;
  status?: "active" | "suspended" | "banned" | "restricted" | null;
  verified?: boolean | null;
  studentVerified?: boolean | null;
  offset?: number;
  limit?: number;
}

/**
 * Server-side filtered + paginated user list (E1). All filters run inside the
 * RPC; ordering is created_at desc, id desc for stable pagination.
 */
export async function listAdminUsers(
  supabase: SupabaseClient,
  query: AdminUserQuery = {}
): Promise<AdminListedUser[]> {
  const rows = await rpc<AdminListedUser[]>(supabase, "admin_list_users", {
    p_search: query.search ?? null,
    p_limit: query.limit ?? 25,
    p_university: query.university ?? null,
    p_status: query.status ?? null,
    p_verified: query.verified ?? null,
    p_student_verified: query.studentVerified ?? null,
    p_offset: query.offset ?? 0,
  });
  return rows ?? [];
}

/**
 * Uses the 3-arg overload: verify/unverify/suspend/unsuspend/ban/restrict/
 * unrestrict via profiles.account_status, school-scope checked by the RPC.
 */
export async function adminUpdateUser(
  supabase: SupabaseClient,
  userId: string,
  action: AdminUserAction,
  note?: string
): Promise<{ ok: boolean }> {
  return rpc<{ ok: boolean }>(supabase, "admin_update_user", {
    p_user_id: userId,
    p_action: action,
    p_note: note ?? null,
  });
}

export async function setAdminUserRestrictions(
  supabase: SupabaseClient,
  userId: string,
  restrictions: {
    can_post: boolean;
    can_message: boolean;
    can_upload: boolean;
    can_use_whisper: boolean;
    can_marketplace: boolean;
    reason?: string | null;
    expires_at?: string | null;
  }
): Promise<{ ok: boolean }> {
  return rpc<{ ok: boolean }>(supabase, "admin_set_user_restrictions", {
    p_user_id: userId,
    p_can_post: restrictions.can_post,
    p_can_message: restrictions.can_message,
    p_can_upload: restrictions.can_upload,
    p_can_use_whisper: restrictions.can_use_whisper,
    p_can_marketplace: restrictions.can_marketplace,
    p_reason: restrictions.reason ?? null,
    p_expires_at: restrictions.expires_at ?? null,
  });
}

export async function listAdminContentCounts(
  supabase: SupabaseClient
): Promise<AdminContentCounts> {
  return rpc<AdminContentCounts>(supabase, "admin_list_content", { p_limit: 30 });
}

export async function getAdminContent(
  supabase: SupabaseClient,
  resource: AdminContentResource,
  search: string | null,
  limit = 50
): Promise<AdminContentRow[]> {
  const rows = await rpc<AdminContentRow[]>(supabase, "admin_get_content", {
    p_resource: resource,
    p_search: search,
    p_limit: limit,
  });
  return rows ?? [];
}

export async function moderateAdminContent(
  supabase: SupabaseClient,
  resource: AdminContentResource,
  id: string,
  action: "hide" | "remove" | "restore" | "approve" | "reject",
  reason?: string
): Promise<{ ok: boolean }> {
  return rpc<{ ok: boolean }>(supabase, "admin_moderate_content", {
    p_resource: resource,
    p_id: id,
    p_action: action,
    p_reason: reason ?? null,
  });
}

export async function listAdminReports(
  supabase: SupabaseClient,
  limit = 60
): Promise<AdminReport[]> {
  const rows = await rpc<AdminReport[]>(supabase, "admin_list_reports", { p_limit: limit });
  return rows ?? [];
}

export async function moderateAdminReport(
  supabase: SupabaseClient,
  reportId: string,
  action: "dismiss" | "remove"
): Promise<{ ok: boolean }> {
  return rpc<{ ok: boolean }>(supabase, "admin_moderate_report", {
    p_report_id: reportId,
    p_action: action,
  });
}

export async function listAdminSchools(supabase: SupabaseClient): Promise<AdminSchool[]> {
  const rows = await rpc<AdminSchool[]>(supabase, "admin_list_schools", {});
  return rows ?? [];
}

export async function upsertAdminSchool(
  supabase: SupabaseClient,
  schoolId: string | null,
  name: string,
  tag: string,
  rules?: string | null
): Promise<{ ok: boolean; school_id: string }> {
  return rpc<{ ok: boolean; school_id: string }>(supabase, "admin_upsert_school", {
    p_school_id: schoolId,
    p_name: name,
    p_tag: tag,
    p_rules: rules ?? null,
  });
}

export async function setCampusAdmin(
  supabase: SupabaseClient,
  userId: string,
  schoolId: string,
  enabled: boolean
): Promise<{ ok: boolean }> {
  return rpc<{ ok: boolean }>(supabase, "admin_set_campus_admin", {
    p_user_id: userId,
    p_school_id: schoolId,
    p_enabled: enabled,
  });
}

/**
 * Grant or revoke an administrative role. Backend: admin_grant_role —
 * SECURITY DEFINER, super_admin-only inside the RPC (the UI gate is
 * convenience only). school_admin requires schoolId; platform roles
 * normalize it to null server-side.
 */
export async function grantAdminRole(
  supabase: SupabaseClient,
  userId: string,
  role: AdminRoleName,
  enabled: boolean,
  schoolId?: string | null
): Promise<{ ok: boolean; role: string; school_id: string | null; is_active: boolean }> {
  return rpc(supabase, "admin_grant_role", {
    p_user_id: userId,
    p_role: role,
    p_school_id: schoolId ?? null,
    p_enabled: enabled,
  });
}

/**
 * One user's console detail incl. their derived admin role
 * (admin_get_user; admin-gated, never exposes raw admin.members rows).
 */
export async function getAdminUserDetail(
  supabase: SupabaseClient,
  userId: string
): Promise<AdminUserDetail> {
  return rpc<AdminUserDetail>(supabase, "admin_get_user", { p_user_id: userId });
}

export async function getAdminFeatureFlags(
  supabase: SupabaseClient
): Promise<AdminFeatureFlag[]> {
  const rows = await rpc<AdminFeatureFlag[]>(supabase, "admin_get_feature_flags", {});
  return rows ?? [];
}

export async function setAdminFeatureFlag(
  supabase: SupabaseClient,
  key: string,
  enabled: boolean
): Promise<{ ok: boolean }> {
  return rpc<{ ok: boolean }>(supabase, "admin_set_feature_flag", {
    p_key: key,
    p_enabled: enabled,
  });
}

export async function getAdminEmergencyState(
  supabase: SupabaseClient
): Promise<AdminEmergencyState | null> {
  return rpc<AdminEmergencyState>(supabase, "admin_get_emergency_state", {});
}

export async function setEmergencyLockdown(
  supabase: SupabaseClient,
  enabled: boolean,
  reason?: string
): Promise<{ ok: boolean; lockdown: boolean }> {
  return rpc<{ ok: boolean; lockdown: boolean }>(supabase, "admin_emergency_lockdown", {
    p_enabled: enabled,
    p_reason: reason ?? null,
  });
}

export async function getAdminAuditLog(
  supabase: SupabaseClient,
  limit = 150
): Promise<AdminAuditEntry[]> {
  const rows = await rpc<AdminAuditEntry[]>(supabase, "admin_get_audit_log", { p_limit: limit });
  return rows ?? [];
}

export async function getAdminSystemHealth(
  supabase: SupabaseClient
): Promise<AdminSystemHealth> {
  return rpc<AdminSystemHealth>(supabase, "admin_get_system_health", {});
}

export async function prepareStudentImport(
  supabase: SupabaseClient,
  schoolId: string,
  fileName: string,
  totalRows: number
): Promise<string> {
  return rpc<string>(supabase, "admin_prepare_student_import", {
    p_school_id: schoolId,
    p_file_name: fileName,
    p_total_rows: totalRows,
  });
}

export interface StudentImportResult {
  processed: number;
  inserted_or_updated: number;
  rejected: number;
  errors: Array<{ matric_number: string | null; error: string }>;
}

export async function importStudentRows(
  supabase: SupabaseClient,
  schoolId: string,
  rows: Array<Record<string, string>>
): Promise<StudentImportResult> {
  return rpc<StudentImportResult>(supabase, "import_student_rows", {
    p_school_id: schoolId,
    p_rows: rows,
  });
}

export async function publishAdminAnnouncement(
  supabase: SupabaseClient,
  scope: string,
  title: string,
  body: string
): Promise<{ ok: boolean; announcement_id: string }> {
  return rpc<{ ok: boolean; announcement_id: string }>(supabase, "admin_publish_announcement", {
    p_scope: scope,
    p_title: title,
    p_body: body,
  });
}
