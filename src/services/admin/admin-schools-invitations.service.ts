import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin Schools discovery + Super Admin invitations (client layer).
 *
 * Backend contracts: sql/proposals/schools-admin-discovery.sql and
 * sql/proposals/super-admin-invitations.sql. Every authorization decision is
 * server-side (SECURITY DEFINER RPCs re-check the caller); this layer only
 * maps errors to friendly copy.
 */

import { rpc } from "@/services/admin/admin.service";

/** Row returned by admin_search_schools (metadata only). */
export interface AdminSchoolSearchRow {
  id: string;
  name: string;
  tag: string;
  registered_users: number;
  waitlisted_users: number;
  new_users_30d: number;
}

export interface AdminSchoolSearchResult {
  rows: AdminSchoolSearchRow[];
  total: number;
}

export interface AdminSchoolDetails {
  id: string;
  name: string;
  tag: string;
  registered_users: number;
  waitlisted_users: number;
  new_users_30d: number;
  new_users_7d: number;
  registered_all_time: number;
}

export interface AdminSchoolUser {
  id: string;
  full_name: string | null;
  department: string | null;
  level: string | null;
  is_verified: boolean;
  student_verified: boolean;
  account_status: string | null;
  created_at: string;
}

export interface AdminSchoolUsersResult {
  rows: AdminSchoolUser[];
  total: number;
}

export interface SuperAdminInvitation {
  id: string;
  invitee_email: string;
  inviter_name: string;
  status: string;
  effective_status: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

/** Search the authoritative schools table (any school, even zero-user ones). */
export async function searchAdminSchools(
  supabase: SupabaseClient,
  query: string,
  limit: number,
  offset: number
): Promise<AdminSchoolSearchResult> {
  const result = await rpc<AdminSchoolSearchResult>(supabase, "admin_search_schools", {
    p_query: query,
    p_limit: limit,
    p_offset: offset,
  });
  return result;
}

export async function getAdminSchoolDetails(
  supabase: SupabaseClient,
  schoolId: string
): Promise<AdminSchoolDetails> {
  return rpc<AdminSchoolDetails>(supabase, "admin_get_school_details", {
    p_school_id: schoolId,
  });
}

export async function listAdminSchoolUsers(
  supabase: SupabaseClient,
  schoolId: string,
  search: string,
  limit: number,
  offset: number
): Promise<AdminSchoolUsersResult> {
  return rpc<AdminSchoolUsersResult>(supabase, "admin_list_school_users", {
    p_school_id: schoolId,
    p_search: search,
    p_limit: limit,
    p_offset: offset,
  });
}

/**
 * Accept a Super Admin invitation. Requires a signed-in session whose email
 * matches the invited address; the backend enforces single-use, expiry,
 * revocation, and email binding.
 */
export async function acceptSuperAdminInvitation(
  supabase: SupabaseClient,
  token: string
): Promise<void> {
  await rpc(supabase, "admin_accept_super_admin_invitation", { p_token: token });
}

export async function listSuperAdminInvitations(
  supabase: SupabaseClient
): Promise<SuperAdminInvitation[]> {
  const rows = await rpc<SuperAdminInvitation[]>(supabase, "admin_list_super_admin_invitations", {});
  return rows ?? [];
}

export async function revokeSuperAdminInvitation(
  supabase: SupabaseClient,
  invitationId: string
): Promise<void> {
  await rpc(supabase, "admin_revoke_super_admin_invitation", {
    p_invitation_id: invitationId,
  });
}

/** Maps invitation/school RPC error codes to friendly admin-facing copy. */
export function invitationErrorCopy(message: string): string {
  if (message.includes("super_admin_required")) {
    return "Only an active Super Admin can manage invitations.";
  }
  if (message.includes("duplicate_pending_invitation")) {
    return "That email already has a pending invitation.";
  }
  if (message.includes("already_super_admin")) {
    return "That email already belongs to an active Super Admin.";
  }
  if (message.includes("invalid_email")) {
    return "That does not look like a valid email address.";
  }
  if (message.includes("rate_limit_exceeded")) {
    return "Too many invitations created recently — try again in a while.";
  }
  if (message.includes("invitation_not_pending")) {
    return "Only pending invitations can be revoked.";
  }
  if (message.includes("invitation_invalid_or_used")) {
    return "This invitation link is invalid, expired, revoked, or already used.";
  }
  if (message.includes("invitation_expired")) {
    return "This invitation has expired. Ask an existing Super Admin for a new one.";
  }
  if (message.includes("invitation_email_mismatch")) {
    return "This invitation was sent to a different email address. Sign in with the invited email to accept it.";
  }
  if (message.includes("admin_access_required")) {
    return "Administrator access is required.";
  }
  if (message.includes("school_not_found")) {
    return "That school no longer exists.";
  }
  return message || "Something went wrong.";
}
