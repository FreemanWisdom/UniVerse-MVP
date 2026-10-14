-- ============================================================================
-- UniVerse ICOS — Campus Ambassador program (applied Oct 14 2026)
-- Implements docs/ambassador-program-design.md (milestone authorized by owner
-- directive Oct 14 2026; design decisions resolved at implementation, noted
-- inline and in the design doc).
-- ============================================================================
-- CHANGES
--   1. admin.roles: + 'campus_ambassador' row (reuses admin.roles /
--      admin.members; school_id NOT NULL for this role).
--   2. admin_grant_role amended (same signature, audited path unchanged):
--      - whitelist + campus_ambassador; school REQUIRED for it
--      - guard: refuses granting campus_ambassador to a user holding an
--        ACTIVE admin-role membership (the members upsert is one-row-per-
--        user; without this guard a grant would silently strip an admin)
--      - granting an admin role over an inactive/ambassador membership
--        stays allowed (promotion path)
--   3. NEW public.ambassador_get_scope() — SECURITY DEFINER; returns the
--      caller's school ONLY IF they hold an active campus_ambassador
--      membership for a school that ALSO matches their profile.university.
--      Null otherwise (UI hides the entry; not a security boundary — the
--      other RPCs re-check).
--   4. NEW public.ambassador_get_campus_stats() — SECURITY DEFINER; counts
--      only: students on campus, pending reports touching campus content,
--      orbit posts 24h/7d.
--   5. NEW public.ambassador_list_reports() — SECURITY DEFINER; report
--      METADATA only (id, content_type, reason, status, created_at) for
--      reports whose content resolves to the ambassador's campus,
--      ACTIONABLE STATUSES ONLY (pending + escalated) — resolved/dismissed
--      history is admin territory. No bodies, no author identities, no
--      reporter identity.
--   6. NEW public.ambassador_escalate_report(report_id, note) — SECURITY
--      DEFINER; sets reports.status='escalated' (NO schema change: escalation
--      details live in the audit log; reviewed_by/reviewed_at stay null —
--      the report is escalated, not reviewed). Idempotent on
--      already-escalated; refuses dismissed/resolved/removed; refuses
--      reports outside the ambassador's campus. Rate-limited 10/hour per
--      ambassador via admin.rate_limit_counters (same fixed-window
--      semantics as admin.consume_write_rate_limit).
--   7. NEW internal helper public._report_campus(type, content_id) —
--      resolves a report's content campus ('post'/'comment' normalized to
--      orbit like Patch C, plus whisper). EXECUTE revoked from everyone;
--      only callable inside the ambassador RPCs.
--
-- DESIGN DECISIONS RESOLVED
--   - Escalation storage: status + audit log, NO new columns (schema change
--     avoided per standing rules).
--   - Who grants: unchanged — admin_grant_role stays super_admin-only.
--     school_admin self-service granting deferred (bigger gate change).
--   - Ambassadors are NOT admins: admin.is_admin() whitelist untouched, so
--     campus_ambassador grants CANNOT open the admin console (verified).
--
-- Rollback: sql/ambassador-program.rollback.sql
-- ============================================================================

-- 1. role row ---------------------------------------------------------------
insert into admin.roles (name, description)
values ('campus_ambassador',
        'Campus-scoped student ambassador: campus stats, report context, escalation only. Not an admin role.')
on conflict (name) do nothing;

-- 2. admin_grant_role amended ------------------------------------------------
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
  if p_role not in ('super_admin', 'platform_admin', 'school_admin', 'moderator', 'campus_ambassador') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;
  select id into v_role_id from admin.roles where name = p_role limit 1;
  if v_role_id is null then
    raise exception 'role_not_configured' using errcode = 'P0002';
  end if;

  -- 4) School scoping: required for school_admin AND campus_ambassador,
  --    normalized away for platform roles (invalid combinations rejected,
  --    never silently kept).
  if p_role in ('school_admin', 'campus_ambassador') then
    if p_school_id is null then
      if p_role = 'school_admin' then
        raise exception 'school_required_for_school_admin' using errcode = '22023';
      else
        raise exception 'school_required_for_campus_ambassador' using errcode = '22023';
      end if;
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

  -- 4b) Ambassador/admin compatibility guard: admin.members is one active
  --     row per user; granting campus_ambassador to an active admin would
  --     silently strip their admin role in the upsert below. Refuse.
  if p_role = 'campus_ambassador' and p_enabled then
    if exists (
      select 1 from admin.members m
      join admin.roles r on r.id = m.role_id
      where m.user_id = p_user_id
        and m.is_active = true
        and r.name in ('super_admin', 'platform_admin', 'school_admin', 'moderator')
    ) then
      raise exception 'ambassador_incompatible_role' using errcode = '22023';
    end if;
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
end;$function$;

-- 3. scope RPC --------------------------------------------------------------
create or replace function public.ambassador_get_scope()
returns jsonb
language plpgsql
stable
security definer
set search_path = 'admin', 'public', 'pg_catalog'
as $function$
declare
  v_school_id uuid;
  v_school_name text;
  v_university text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select m.school_id, s.name
  into v_school_id, v_school_name
  from admin.members m
  join admin.roles r on r.id = m.role_id
  join public.schools s on s.id = m.school_id
  where m.user_id = auth.uid()
    and m.is_active = true
    and r.name = 'campus_ambassador';

  if v_school_id is null then
    return null;
  end if;

  -- Scope must ALSO match the caller's own campus: an ambassador serves the
  -- school they study at (double-checked against profile.university).
  select p.university into v_university
  from public.profiles p
  where p.id = auth.uid();

  if v_university is null or v_university <> v_school_name then
    return null;
  end if;

  return jsonb_build_object(
    'school_id', v_school_id,
    'school_name', v_school_name
  );
end;$function$;

comment on function public.ambassador_get_scope() is
  'Returns the campus_ambassador caller''s school (id + name) or null. UI gate only — every ambassador RPC re-checks scope server-side.';

-- internal helper: resolve a report's content campus --------------------------
create or replace function public._report_campus(p_content_type text, p_content_id uuid)
returns text
language sql
stable
security definer
set search_path = 'public', 'pg_catalog'
as $function$
  select case
    when p_content_type in ('post', 'orbit_post') then
      (select f.school_tag from public.orbit_feed f where f.id = p_content_id)
    when p_content_type in ('comment', 'orbit_comment') then
      (select f.school_tag from public.orbit_comments c
        join public.orbit_feed f on f.id = c.post_id
        where c.id = p_content_id)
    when p_content_type = 'whisper' then
      (select w.school_tag from public.whisper_posts w where w.id = p_content_id)
    else null
  end;
$function$;

revoke all on function public._report_campus(text, uuid) from public;
revoke all on function public._report_campus(text, uuid) from anon;
revoke all on function public._report_campus(text, uuid) from authenticated;

-- 4. campus stats ------------------------------------------------------------
create or replace function public.ambassador_get_campus_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = 'admin', 'public', 'pg_catalog'
as $function$
declare
  v_scope jsonb;
  v_school text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  v_scope := public.ambassador_get_scope();
  if v_scope is null then
    raise exception 'ambassador_access_required';
  end if;
  v_school := v_scope->>'school_name';

  return jsonb_build_object(
    'school_name', v_school,
    'students', (select count(*) from public.profiles p where p.university = v_school),
    'pending_reports', (
      select count(*) from public.reports r
      where r.status = 'pending'
        and coalesce(public._report_campus(r.content_type, r.content_id), '') = v_school
    ),
    'orbit_posts_24h', (
      select count(*) from public.orbit_feed f
      where f.school_tag = v_school and f.created_at > now() - interval '24 hours'
    ),
    'orbit_posts_7d', (
      select count(*) from public.orbit_feed f
      where f.school_tag = v_school and f.created_at > now() - interval '7 days'
    )
  );
end;$function$;

-- 5. report context list ------------------------------------------------------
create or replace function public.ambassador_list_reports()
returns table (
  id uuid,
  content_type text,
  reason text,
  status text,
  created_at timestamptz)
language plpgsql
stable
security definer
set search_path = 'admin', 'public', 'pg_catalog'
as $function$
declare
  v_scope jsonb;
  v_school text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  v_scope := public.ambassador_get_scope();
  if v_scope is null then
    raise exception 'ambassador_access_required';
  end if;
  v_school := v_scope->>'school_name';

  -- Metadata ONLY. No message bodies, no whisper text, no author or
  -- reporter identities ever leave the server through this RPC.
  return query
  select
    r.id,
    r.content_type::text,
    r.reason::text,
    r.status::text,
    r.created_at
  from public.reports r
  where r.status in ('pending', 'escalated')
    and coalesce(public._report_campus(r.content_type, r.content_id), '') = v_school
  order by r.created_at desc
  limit 50;
end;$function$;

-- 6. escalation --------------------------------------------------------------
create or replace function public.ambassador_escalate_report(
  p_report_id uuid,
  p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = 'admin', 'public', 'pg_catalog'
as $function$
declare
  v_scope jsonb;
  v_school text;
  r public.reports%rowtype;
  v_started timestamptz;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  v_scope := public.ambassador_get_scope();
  if v_scope is null then
    raise exception 'ambassador_access_required';
  end if;
  v_school := v_scope->>'school_name';

  -- Rate limit: 10 escalations/hour per ambassador (same fixed-window
  -- semantics as admin.consume_write_rate_limit). Attempts count even when
  -- the report turns out invalid — this is an anti-spam budget.
  insert into admin.rate_limit_counters (bucket_key, window_started_at, attempt_count)
  values ('escalate_report:' || auth.uid()::text, now(), 1)
  on conflict (bucket_key) do update set
    window_started_at = case when now() - admin.rate_limit_counters.window_started_at
                                >= interval '3600 seconds'
                           then now() else admin.rate_limit_counters.window_started_at end,
    attempt_count = case when now() - admin.rate_limit_counters.window_started_at
                                >= interval '3600 seconds'
                           then 1 else admin.rate_limit_counters.attempt_count + 1 end
  returning window_started_at, attempt_count into v_started, v_count;

  if v_count > 10 then
    raise exception 'rate_limit_exceeded: too many escalations — try again in % minutes',
      ceil(extract(epoch from (v_started + interval '3600 seconds' - now())) / 60)::int
      using errcode = 'P0001';
  end if;

  select * into r from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'report_not_found' using errcode = 'P0002';
  end if;

  -- Idempotent: escalating an already-escalated report is a no-op success.
  if r.status = 'escalated' then
    return jsonb_build_object('ok', true, 'already_escalated', true);
  end if;
  if r.status in ('dismissed', 'resolved', 'removed') then
    raise exception 'report_already_resolved' using errcode = 'P0002';
  end if;

  -- Scope: the report's content campus must be the ambassador's campus.
  if coalesce(public._report_campus(r.content_type, r.content_id), '') <> v_school then
    raise exception 'report_outside_scope' using errcode = '42501';
  end if;

  -- NO schema change: status only. reviewed_by/reviewed_at stay null — the
  -- report is escalated, not reviewed. Full details in the audit log.
  update public.reports set status = 'escalated' where id = p_report_id;

  perform admin.write_audit(
    'escalate_report', 'report', p_report_id::text, 'success',
    jsonb_build_object(
      'school', v_school,
      'ambassador', auth.uid()::text,
      'note', left(trim(coalesce(p_note, '')), 500)
    )
  );

  return jsonb_build_object('ok', true, 'already_escalated', false);
end;$function$;

-- grants: authenticated only, anon/public revoked -----------------------------
revoke all on function public.ambassador_get_scope() from public;
revoke all on function public.ambassador_get_scope() from anon;
grant execute on function public.ambassador_get_scope() to authenticated;

revoke all on function public.ambassador_get_campus_stats() from public;
revoke all on function public.ambassador_get_campus_stats() from anon;
grant execute on function public.ambassador_get_campus_stats() to authenticated;

revoke all on function public.ambassador_list_reports() from public;
revoke all on function public.ambassador_list_reports() from anon;
grant execute on function public.ambassador_list_reports() to authenticated;

revoke all on function public.ambassador_escalate_report(uuid, text) from public;
revoke all on function public.ambassador_escalate_report(uuid, text) from anon;
grant execute on function public.ambassador_escalate_report(uuid, text) to authenticated;
