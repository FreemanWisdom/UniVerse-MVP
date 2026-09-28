-- Phase CC-E2: admin_get_overview — add student_verified, suspended_users, restricted_users,
-- active_tribes (approved Sept 28 2026). All existing keys preserved unchanged. 'attention'
-- is extended (same object shape: title/detail/action) with lockdown state, core health
-- failures and suspended/restricted account counts, so the Overview can drive an
-- Attention Required panel from real signals only. Authorization gate unchanged.

create or replace function public.admin_get_overview()
returns jsonb
language plpgsql
security definer
set search_path = 'admin', 'public', 'pg_catalog'
as $$
declare
  u bigint; v bigint; active24 bigint; reports bigint; campuses bigint; sessions bigint;
  sv bigint; susp bigint; restr bigint; tribes bigint;
  db_ok boolean := false; auth_ok boolean := false; lockdown_on boolean := false;
  attention jsonb := '[]'::jsonb;
begin
  if not admin.is_admin() then raise exception 'admin_access_required'; end if;

  -- existing metrics (unchanged)
  select count(*) into u from public.profiles;
  select count(*) into v from public.profiles where is_verified = true;
  select count(*) into active24 from auth.users where last_sign_in_at >= now() - interval '24 hours';
  select count(*) into reports from public.reports where coalesce(status, 'open') in ('open', 'pending');
  select count(*) into campuses from public.schools;
  select count(*) into sessions from auth.sessions where not_after > now();

  -- new metrics (E2)
  select count(*) into sv from public.profiles where student_verified = true;
  select count(*) into susp from public.profiles where coalesce(account_status, 'active') = 'suspended';
  select count(*) into restr from public.profiles where coalesce(account_status, 'active') = 'restricted';
  select count(*) into tribes from public.tribes where coalesce(moderation_status, 'active') = 'active';

  -- cheap core health probes (same pattern as admin_get_system_health)
  begin perform 1 from public.profiles limit 1; db_ok := true; exception when others then db_ok := false; end;
  begin perform 1 from auth.users limit 1; auth_ok := true; exception when others then auth_ok := false; end;
  select coalesce(lockdown, false) into lockdown_on from admin.emergency_state where id = true;

  -- attention: real actionable conditions only
  if reports > 0 then
    attention := attention || jsonb_build_array(jsonb_build_object(
      'title', 'Reports waiting', 'detail', reports || ' report(s) need review', 'action', 'moderation'));
  end if;
  if lockdown_on then
    attention := attention || jsonb_build_array(jsonb_build_object(
      'title', 'Emergency lockdown active', 'detail', 'All capability gates are blocked platform-wide', 'action', 'settings'));
  end if;
  if not db_ok or not auth_ok then
    attention := attention || jsonb_build_array(jsonb_build_object(
      'title', 'System health', 'detail', 'A core service failed its health check', 'action', 'health'));
  end if;
  if susp > 0 then
    attention := attention || jsonb_build_array(jsonb_build_object(
      'title', 'Suspended accounts', 'detail', susp || ' account(s) currently suspended', 'action', 'users_suspended'));
  end if;
  if restr > 0 then
    attention := attention || jsonb_build_array(jsonb_build_object(
      'title', 'Restricted accounts', 'detail', restr || ' account(s) currently restricted', 'action', 'users_restricted'));
  end if;

  return jsonb_build_object(
    'mode', 'live',
    'total_users', u, 'verified_users', v, 'active_today', active24,
    'pending_reports', reports, 'campuses', campuses, 'active_sessions', sessions,
    'student_verified', sv, 'suspended_users', susp, 'restricted_users', restr, 'active_tribes', tribes,
    'pulse', jsonb_build_object(
      'Orbit', (select count(*) from public.orbit_feed), 'Chat', (select count(*) from public.messages),
      'Study resources', (select count(*) from public.study_resources),
      'Whisper', (select count(*) from public.whisper_posts where coalesce(is_deleted, false) = false),
      'Errands', (select count(*) from public.errands), 'Lodges', (select count(*) from public.lodges),
      'Marketplace', (select count(*) from public.market), 'Hustles', (select count(*) from public.hustles),
      'Reports', (select count(*) from public.reports), 'Notifications', (select count(*) from public.notifications)
    ),
    'health', jsonb_build_object(
      'database', case when db_ok then 'online' else 'error' end,
      'auth', case when auth_ok then 'online' else 'error' end
    ),
    'universities', (select coalesce(jsonb_agg(x order by x.registered_users desc), '[]'::jsonb) from (
      select coalesce(nullif(trim(p.university), ''), 'Unknown / not set') university,
             count(*)::bigint registered_users,
             count(*) filter (where p.is_verified = true)::bigint verified_users,
             count(*) filter (where au.last_sign_in_at >= now() - interval '24 hours')::bigint active_24h
      from public.profiles p join auth.users au on au.id = p.id
      group by 1 order by count(*) desc, 1 limit 100
    ) x),
    'users', (select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
      select p.id, p.full_name, au.email, p.university, p.department, p.level, p.is_verified,
             p.account_status, au.created_at, au.last_sign_in_at,
             coalesce(p.account_status, 'active') = 'suspended' as is_suspended
      from public.profiles p join auth.users au on au.id = p.id
      order by au.created_at desc limit 250
    ) x),
    'recent_activity', (select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
      select a.id, a.created_at, a.actor_id, coalesce(p.full_name, au.email, 'System') actor_name,
             a.action, a.entity_type, a.entity_id, a.result, a.metadata
      from admin.site_activity a
      left join public.profiles p on p.id = a.actor_id
      left join auth.users au on au.id = a.actor_id
      order by a.created_at desc limit 500
    ) x),
    'auth_activity', (select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
      select id, created_at, ip_address, payload->>'action' action, payload->>'user_id' user_id,
             payload->'metadata' metadata
      from auth.audit_log_entries order by created_at desc limit 250
    ) x),
    'attention', attention
  );
end;
$$;
