/**
 * Admin backend contracts, LIVE-VERIFIED Sept 2026 (read-only audit).
 * All admin RPCs live in the public schema (PostgREST-callable), are
 * SECURITY DEFINER, and gate themselves with admin.is_admin() /
 * admin.is_super_admin() — the client cannot bypass them.
 * Roles: super_admin, platform_admin, school_admin, moderator.
 * One active super_admin exists; admin-key-login / -v2 edge functions are
 * retired 410 stubs — admin access is regular auth + admin.members rows.
 */

export interface AdminBootstrap {
  authorized: boolean;
  admin?: {
    user_id: string;
    role: string;
    school_id: string | null;
    school_name: string | null;
  };
}

export interface AdminOverviewUser {
  id: string;
  full_name: string | null;
  email: string;
  university: string | null;
  department: string | null;
  level: string | null;
  is_verified: boolean;
  account_status: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_suspended: boolean;
}

export interface AdminOverviewActivity {
  id: number | string;
  created_at: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  result: string;
  metadata: Record<string, unknown>;
}

export interface AdminOverview {
  mode: string;
  total_users: number;
  verified_users: number;
  active_today: number;
  pending_reports: number;
  campuses: number;
  active_sessions: number;
  pulse: Record<string, number>;
  universities: Array<{
    university: string;
    registered_users: number;
    verified_users: number;
    active_24h: number;
  }>;
  users: AdminOverviewUser[];
  recent_activity: AdminOverviewActivity[];
  auth_activity: Array<{
    id: string;
    created_at: string;
    ip_address: string | null;
    action: string | null;
    user_id: string | null;
    metadata: Record<string, unknown> | null;
  }>;
  attention: Array<{ title: string; detail: string; action: string }>;
}

export interface AdminListedUser {
  id: string;
  full_name: string | null;
  email: string;
  university: string | null;
  school_tag: string | null;
  department: string | null;
  level: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  created_at: string;
}

export type AdminUserAction =
  | "verify"
  | "unverify"
  | "suspend"
  | "unsuspend"
  | "ban"
  | "restrict"
  | "unrestrict";

export interface AdminContentCounts {
  orbit_posts: number;
  chat_messages: number;
  study_resources: number;
  tribes: number;
  lodges: number;
  errands: number;
  marketplace: number;
  hustles: number;
  whisper_posts: number;
}

export interface AdminContentRow {
  id: string;
  moderation_status: string;
  created_at: string;
  // orbit
  poster_id?: string;
  poster_name?: string;
  school_tag?: string | null;
  content?: string;
  // chat
  conversation_id?: string;
  sender_id?: string;
  // study
  title?: string;
  course_code?: string | null;
  uploader_id?: string;
  resource_type?: string;
  // tribe
  name?: string;
  university?: string;
  creator_id?: string;
}

export type AdminContentResource =
  | "orbit"
  | "chat"
  | "study"
  | "tribe"
  | "tribe_post"
  | "lodge"
  | "errand"
  | "market"
  | "hustle"
  | "whisper";

export interface AdminReport {
  id: string;
  reason: string | null;
  status: string | null;
  created_at: string;
  content_type: string | null;
  content_id: string | null;
  content_preview: string | null;
}

export interface AdminSchool {
  id: string;
  name: string;
  tag: string;
  student_count: number;
  verification_enabled: boolean;
  is_active: boolean;
}

export interface AdminFeatureFlag {
  key: string;
  name: string;
  enabled: boolean;
  description: string | null;
}

export interface AdminAuditEntry {
  created_at: string;
  admin_id: string | null;
  admin_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  result: string;
  context: Record<string, unknown> | null;
}

export interface AdminEmergencyState {
  lockdown: boolean;
  reason: string | null;
  enabled_at: string | null;
}

export interface StudentImportResult {
  processed: number;
  inserted_or_updated: number;
  rejected: number;
  errors: Array<{ matric_number: string | null; error: string }>;
}

export interface AdminSystemHealth {
  database: string;
  auth: string;
  realtime: string;
  storage: string;
  rpc: string;
  activity_events_24h: number;
  checked_at: string;
}
