-- Phase 7: read-only administrator roster RPC.
--
-- Purpose: powers the Admin Console "Administrators" page. The frontend
-- cannot read admin.members directly (no client grants on the admin schema;
-- RLS on admin.members is self-or-super_admin), so a SECURITY DEFINER
-- function follows the established pattern of admin_list_users /
-- admin_get_user: gate with admin.is_admin(), return derived display data.
--
-- Authorization decisions mirrored from existing precedent:
--   * Any active admin may see the roster (same gate as admin_list_users).
--   * Emails are exposed to any admin (same as admin_get_user).
--   * Emails of members whose profile/auth row is gone come back as ''.
--
-- Rollback:  DROP FUNCTION IF EXISTS public.admin_list_admins();

CREATE OR REPLACE FUNCTION public.admin_list_admins()
RETURNS TABLE(
  user_id uuid,
  full_name text,
  email text,
  role text,
  school_id uuid,
  school_name text,
  is_active boolean,
  granted_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'admin', 'public', 'pg_catalog'
AS $function$
begin
  if not admin.is_admin() then raise exception 'admin_access_required'; end if;

  -- All column references are table-qualified: RETURNS TABLE parameter names
  -- become PL/pgSQL variables and unqualified names caused 42702 bugs before
  -- (campus_chat_discover_students, admin_bootstrap).
  return query
  select
    m.user_id,
    coalesce(p.full_name, '')::text,
    coalesce(au.email, '')::text,
    r.name::text,
    m.school_id,
    s.name::text,
    m.is_active,
    m.created_at,
    m.updated_at
  from admin.members m
  join admin.roles r on r.id = m.role_id
  left join public.profiles p on p.id = m.user_id
  left join auth.users au on au.id = m.user_id
  left join public.schools s on s.id = m.school_id
  order by m.is_active desc, r.name, coalesce(p.full_name, au.email);
end
$function$;

GRANT EXECUTE ON FUNCTION public.admin_list_admins() TO authenticated;
