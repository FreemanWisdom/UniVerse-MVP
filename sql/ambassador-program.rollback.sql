-- ============================================================================
-- UniVerse ICOS — ROLLBACK: Campus Ambassador program
-- Exact inverse of sql/ambassador-program.sql.
-- PRECONDITION: no client build calling the ambassador RPCs is live;
-- ambassador memberships removed (or they become orphan rows).
-- ============================================================================

-- 1. drop the four ambassador RPCs and their grants
drop function if exists public.ambassador_escalate_report(uuid, text);
drop function if exists public.ambassador_list_reports();
drop function if exists public.ambassador_get_campus_stats();
drop function if exists public.ambassador_get_scope();
drop function if exists public._report_campus(text, uuid);

-- 2. restore the pre-ambassador admin_grant_role (5-role body, verified
--    from the live production catalog before the ambassador change)
create or replace function public.admin_grant_role(
  p_user_id uuid,
  p_role text,
  p_school_id uuid default null,
  p_enabled boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = 'admin', 'public', 'pg_catalog'
as $function$
declare
  v_caller uuid := auth.uid();
  v_role_id uuid;
  v_school_id uuid;
  v_target_exists boolean;
  v_school_exists boolean;
  v_active_super_admins integer;
begin
  if v_caller is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not admin.is_super_admin() then
    raise exception 'super_admin_required' using errcode = '42501';
  end if;

  select exists(select 1 from auth.users u where u.id = p_user_id)
    into v_target_exists;
  if not v_target_exists then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  if p_role not in ('super_admin', 'platform_admin', 'school_admin', 'moderator') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;
  select id into v_role_id from admin.roles where name = p_role limit 1;
  if v_role_id is null then
    raise exception 'role_not_configured' using errcode = 'P0002';
  end if;

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

  insert into admin.members(user_id, role_id, school_id, is_active)
  values (p_user_id, v_role_id, v_school_id, p_enabled)
  on conflict (user_id) do update
    set role_id = excluded.role_id,
        school_id = excluded.school_id,
        is_active = excluded.is_active,
        updated_at = now();

  if p_role = 'school_admin' and p_enabled then
    insert into admin.school_admin_assignments(user_id, school_id, created_by)
    values (p_user_id, v_school_id, v_caller)
    on conflict (user_id, school_id) do nothing;
  elsif p_role = 'school_admin' and not p_enabled then
    delete from admin.school_admin_assignments
      where user_id = p_user_id and school_id = v_school_id;
  end if;

  select count(*) into v_active_super_admins
    from admin.members m
    join admin.roles r on r.id = m.role_id
    where r.name = 'super_admin' and m.is_active = true;
  if v_active_super_admins < 1 then
    raise exception 'last_super_admin_lockout_protection' using errcode = 'P0001';
  end if;

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
end;$function$;

-- 3. drop the role row (fails safely if memberships still reference it:
--    remove admin.members rows with this role_id first)
delete from admin.members m
  where m.role_id in (select id from admin.roles where name = 'campus_ambassador');
delete from admin.roles where name = 'campus_ambassador';

-- 4. rate counters for escalations are inert once the RPC is gone; leave
--    them (fixed-window rows expire logically) or delete explicitly:
delete from admin.rate_limit_counters where bucket_key like 'escalate_report:%';
