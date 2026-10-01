-- Administrator role management: public.admin_grant_role
-- Applied live: 2026-09-30 (owner-approved via implementation request)
--
-- Why: the audit (2026-09-30) proved that NO client-callable path exists to
-- grant/revoke full admin roles. admin.members has RLS with a SELECT-only
-- policy (no client writes), admin_grant_console_member is service_role-only
-- and hardcoded to a single legacy email, and admin_set_campus_admin grants
-- only school_admin. The 2 existing admin rows were created by direct SQL.
--
-- Design (mirrors admin_set_campus_admin, the existing audited pattern):
--   * SECURITY DEFINER, self-gating with admin.is_super_admin() — the RPC is
--     the real authorization boundary; the frontend never is.
--   * Upsert admin.members on conflict (user_id) — one active-role row per
--     user, exactly like the existing campus-admin flow.
--   * school_admin mirrors admin_set_campus_admin's school_admin_assignments
--     bookkeeping; platform roles normalize school_id to null.
--   * Lockout protection: after the upsert, if the change would leave zero
--     active super_admins, raise — the exception rolls the whole transaction
--     back. Covers self-revoke, demotion to another role, and disable.
--   * Every grant and revocation is audited via admin.write_audit().
--
-- Note: Postgres requires every parameter after the first defaulted one to have a
-- default too, hence p_enabled default true. The frontend always passes all four
-- arguments explicitly, so the default is never relied upon.
--
-- Rollback (full):
--   revoke execute on function public.admin_grant_role(uuid, text, uuid, boolean) from authenticated, service_role;
--   drop function if exists public.admin_grant_role(uuid, text, uuid, boolean);

create or replace function public.admin_grant_role(
  p_user_id uuid,
  p_role text,
  p_school_id uuid default null,
  p_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path to 'admin', 'public', 'pg_catalog'
as $function$
declare
  v_caller uuid := auth.uid();
  v_role_id uuid;
  v_school_id uuid;
  v_target_exists boolean;
  v_school_exists boolean;
  v_active_super_admins integer;
begin
  -- 1) Authentication + authorization (server-side, always enforced).
  if v_caller is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not admin.is_super_admin() then
    raise exception 'super_admin_required' using errcode = '42501';
  end if;

  -- 2) Target must be an existing user (prevents phantom memberships).
  select exists(select 1 from auth.users u where u.id = p_user_id)
    into v_target_exists;
  if not v_target_exists then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  -- 3) Role validation.
  if p_role not in ('super_admin', 'platform_admin', 'school_admin', 'moderator') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;
  select id into v_role_id from admin.roles where name = p_role limit 1;
  if v_role_id is null then
    raise exception 'role_not_configured' using errcode = 'P0002';
  end if;

  -- 4) School scoping: required for school_admin, normalized away for
  --    platform roles (invalid combinations rejected, never silently kept).
  if p_role = 'school_admin' then
    if p_school_id is null then
      raise exception 'school_required_for_school_admin' using errcode = '22023';
    end if;
    select exists(select 1 from public.schools s where s.id = p_school_id)
      into v_school_exists;
    if not v_school_exists then
      raise exception 'school_not_found' using errcode = 'P0002';
    end if;
    v_school_id := p_school_id;
  else
    v_school_id := null;
  end if;

  -- 5) Apply the change (upsert, same semantics as admin_set_campus_admin).
  insert into admin.members(user_id, role_id, school_id, is_active)
  values (p_user_id, v_role_id, v_school_id, p_enabled)
  on conflict (user_id) do update
    set role_id = excluded.role_id,
        school_id = excluded.school_id,
        is_active = excluded.is_active,
        updated_at = now();

  -- Keep the campus bookkeeping table coherent for school_admin, matching
  -- admin_set_campus_admin's writes.
  if p_role = 'school_admin' and p_enabled then
    insert into admin.school_admin_assignments(user_id, school_id, created_by)
    values (p_user_id, v_school_id, v_caller)
    on conflict (user_id, school_id) do nothing;
  elsif p_role = 'school_admin' and not p_enabled then
    delete from admin.school_admin_assignments
      where user_id = p_user_id and school_id = v_school_id;
  end if;

  -- 6) Lockout protection: never leave the system with zero active
  --    super_admins. Raising here rolls the entire transaction back,
  --    including the upsert above.
  select count(*) into v_active_super_admins
    from admin.members m
    join admin.roles r on r.id = m.role_id
    where r.name = 'super_admin' and m.is_active = true;
  if v_active_super_admins < 1 then
    raise exception 'last_super_admin_lockout_protection' using errcode = 'P0001';
  end if;

  -- 7) Audit every grant and every revocation through the existing mechanism.
  perform admin.write_audit(
    case when p_enabled then 'grant_admin_role' else 'revoke_admin_role' end,
    'admin_member',
    p_user_id::text,
    'success',
    jsonb_build_object(
      'role', p_role,
      'enabled', p_enabled,
      'school_id', v_school_id,
      'target_user_id', p_user_id::text
    )
  );

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'role', p_role,
    'school_id', v_school_id,
    'is_active', p_enabled
  );
end;
$function$;

-- Permissions: callable by authenticated clients; the function itself is the
-- authorization boundary (super_admin check inside). No table privileges are
-- granted — admin.members remains unmodifiable directly by any client.
-- Postgres grants EXECUTE to PUBLIC by default on function creation — revoke
-- that (and anon) so only authenticated clients and the service role can call,
-- matching every other admin RPC's ACL.
revoke execute on function public.admin_grant_role(uuid, text, uuid, boolean)
  from public, anon;
grant execute on function public.admin_grant_role(uuid, text, uuid, boolean)
  to authenticated, service_role;

-- Verify:
--   select grantee, routine_name from information_schema.routine_privileges
--     where routine_schema = 'public' and routine_name = 'admin_grant_role';

-- ---------------------------------------------------------------------------
-- Companion (same change set): extend public.admin_get_user with DERIVED admin
-- membership so the console can display a target user's current role.
--
-- Why: clients hold NO table privileges on admin.members (verified live: even a
-- super_admin's authenticated role gets "permission denied for table members"),
-- so the existing SELECT policy on admin.members is inert for clients — there
-- is deliberately no direct read path. Exactly-one-new-RPC is a hard constraint
-- of this change, so the read rides the existing is_admin()-gated
-- admin_get_user, returning only the role NAME + school + active flag for the
-- requested user. No ids beyond what the page already shows; no raw rows.
--
-- The function body is otherwise identical to the previous version (fix-admin-
-- created-at.sql heritage): profiles lookup, email/created_at from auth.users,
-- suspension from admin.user_controls — three new jsonb keys appended at the
-- end, which is backward compatible for every existing consumer.

create or replace function public.admin_get_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'admin', 'public', 'pg_catalog'
as $function$
declare rec record; e text; suspended boolean; created timestamptz;
  v_admin_role text; v_admin_school uuid; v_admin_active boolean;
begin
 if not admin.is_admin() then raise exception 'admin_access_required'; end if;
 select pr.* into rec from public.profiles pr where pr.id=p_user_id;
 if not found then raise exception 'user_not_found'; end if;
 select au.email, au.created_at into e, created from auth.users au where au.id=p_user_id;
 select coalesce(uc.is_suspended,false) into suspended from admin.user_controls uc where uc.user_id=p_user_id;
 select r.name, m.school_id, m.is_active into v_admin_role, v_admin_school, v_admin_active
   from admin.members m join admin.roles r on r.id=m.role_id
   where m.user_id=p_user_id limit 1;
 return jsonb_build_object('id',rec.id,'full_name',rec.full_name,'email',e,'university',rec.university,
   'department',rec.department,'level',rec.level,'is_verified',rec.is_verified,
   'student_verified',rec.student_verified,'is_suspended',coalesce(suspended,false),'created_at',created,
   'admin_role',v_admin_role,'admin_role_school_id',v_admin_school,'admin_role_active',coalesce(v_admin_active,false));
end;
$function$;

-- Rollback (companion): restore the previous admin_get_user, which returned
-- the same object WITHOUT the admin_role / admin_role_school_id /
-- admin_role_active keys — recreate from git history of this file's parent
-- (sql/fix-admin-created-at.sql heritage) or from the audit report of
-- 2026-09-30, dropping the three keys and the v_admin_* variables/select.
