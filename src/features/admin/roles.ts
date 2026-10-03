import { AdminRoleName } from "@/features/admin/admin.types";

/** Selectable roles — mirrors admin_grant_role's server-side validation list. */
export const ADMIN_ROLES: Array<{ value: AdminRoleName; label: string }> = [
  { value: "super_admin", label: "Super admin (full platform control)" },
  { value: "platform_admin", label: "Platform admin" },
  { value: "school_admin", label: "School admin (campus-scoped)" },
  { value: "moderator", label: "Moderator" },
];

export const ROLE_LABEL: Record<AdminRoleName, string> = {
  super_admin: "Super admin",
  platform_admin: "Platform admin",
  school_admin: "School admin",
  moderator: "Moderator",
};

/** Friendly copy for the error codes admin_grant_role can raise. */
export const ADMIN_ROLE_ERRORS: Record<string, string> = {
  super_admin_required: "Only a super admin can manage administrator roles.",
  admin_access_required: "Your account can't perform this action.",
  school_required_for_school_admin: "School admins need a campus — pick a school first.",
  school_not_found: "That school no longer exists. Refresh and try again.",
  user_not_found: "That user no longer exists. Search again.",
  invalid_role: "Pick a valid role.",
  role_not_configured: "That role is not configured in the backend. Contact the platform team.",
  last_super_admin_lockout_protection:
    "Blocked: this would leave the platform with no active super admin.",
  authentication_required: "Your session expired — sign in again.",
};

export function friendlyAdminError(message: unknown, fallback: string): string {
  const text = message instanceof Error ? message.message : String(message ?? "");
  for (const code of Object.keys(ADMIN_ROLE_ERRORS)) {
    if (text.includes(code)) return ADMIN_ROLE_ERRORS[code];
  }
  return text || fallback;
}
