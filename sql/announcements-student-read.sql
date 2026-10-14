-- ============================================================================
-- UniVerse ICOS — Student-facing announcements (applied Oct 14 2026)
-- Implements docs/announcements-design.md (approved for implementation by
-- owner directive Oct 14 2026).
-- ============================================================================
-- CHANGES
--   1. admin.announcements: + attribution_mode ('official'|'pseudonymous',
--      default 'official'), + display_name (public byline).
--      published_by stays internal and is NEVER returned to students.
--   2. admin_publish_announcement(scope,title,body,+attribution args w/
--      defaults — old 3-arg call sites keep working):
--      - scope whitelist: 'global' (legacy 'platform' normalized to 'global'
--        on write so the currently-deployed admin console cannot break),
--        or 'campus:<exact schools.name>' (unknown campus rejected).
--      - attribution validated; pseudonymous requires a non-empty byline;
--        official defaults byline to 'UniVerse Team'.
--      - audit row keeps the Patch C signature; metadata gains attribution.
--   3. NEW public.get_active_announcements() — SECURITY DEFINER read RPC:
--      active rows where scope='global'/'platform' OR scope matches the
--      CALLER's own campus (computed server-side from profiles.university,
--      never a client parameter). Returns id,title,body,scope,
--      attribution_mode,display_name,published_at. NOT published_by.
--      EXECUTE granted to authenticated only (anon/public revoked).
--      No table grants: admin.announcements stays admin-only at RLS level.
-- Rollback: sql/announcements-student-read.rollback.sql
-- ============================================================================

-- 1. attribution columns ----------------------------------------------------
alter table admin.announcements
  add column if not exists attribution_mode text not null default 'official'
    constraint announcements_attribution_mode_check
      check (attribution_mode in ('official','pseudonymous')),
  add column if not exists display_name text;

-- 2. publish RPC (scope + attribution validation) --------------------------
create or replace function public.admin_publish_announcement(
  p_scope text,
  p_title text,
  p_body text,
  p_attribution_mode text default 'official',
  p_display_name text default 'UniVerse Team')
returns jsonb
language plpgsql
security definer
set search_path = 'admin', 'public', 'pg_catalog'
as $function$
declare
  aid uuid;
  v_scope text;
  v_mode text;
  v_name text;
begin
  if not admin.is_admin() then raise exception 'admin_access_required'; end if;
  if length(trim(coalesce(p_title,''))) = 0 or length(trim(coalesce(p_body,''))) = 0 then
    raise exception 'announcement_required';
  end if;

  -- scope whitelist: global (legacy 'platform' alias) or an exact campus
  if p_scope in ('global','platform') then
    v_scope := 'global';
  elsif p_scope like 'campus:%' and length(p_scope) > 7 then
    if not exists (select 1 from public.schools s where s.name = substr(p_scope, 8)) then
      raise exception 'unknown_campus_scope';
    end if;
    v_scope := p_scope;
  else
    raise exception 'invalid_announcement_scope';
  end if;

  -- attribution validation
  if p_attribution_mode = 'official' then
    v_mode := 'official';
    v_name := coalesce(nullif(trim(coalesce(p_display_name,'')), ''), 'UniVerse Team');
  elsif p_attribution_mode = 'pseudonymous' then
    if coalesce(nullif(trim(coalesce(p_display_name,'')), ''), '') = '' then
      raise exception 'display_name_required';
    end if;
    v_mode := 'pseudonymous';
    v_name := trim(p_display_name);
  else
    raise exception 'invalid_attribution_mode';
  end if;

  insert into admin.announcements (scope, title, body, published_by, attribution_mode, display_name)
  values (v_scope, trim(p_title), trim(p_body), auth.uid(), v_mode, v_name)
  returning id into aid;

  perform admin.write_audit(
    'publish_announcement', 'announcement', aid::text, 'success',
    jsonb_build_object('scope', v_scope, 'attribution_mode', v_mode, 'display_name', v_name));

  return jsonb_build_object('ok', true, 'announcement_id', aid);
end;$function$;

-- 2b. drop the stale 3-arg overload so ALL publishes go through the
-- validated body (3-arg call sites still resolve via the defaults).
drop function if exists public.admin_publish_announcement(text, text, text);

-- 3. student read RPC -------------------------------------------------------
create or replace function public.get_active_announcements()
returns table (
  id uuid,
  title text,
  body text,
  scope text,
  attribution_mode text,
  display_name text,
  published_at timestamptz)
language plpgsql
stable
security definer
set search_path = 'public', 'pg_catalog'
as $function$
declare
  v_university text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select p.university into v_university
  from public.profiles p
  where p.id = auth.uid();

  return query
  select
    a.id,
    a.title::text,
    a.body::text,
    a.scope::text,
    a.attribution_mode::text,
    coalesce(a.display_name, 'UniVerse Team')::text,
    a.published_at
  from admin.announcements a
  where a.is_active
    and (
      a.scope in ('global', 'platform')
      or (v_university is not null and a.scope = 'campus:' || v_university)
    )
  order by a.published_at desc
  limit 50;
end;$function$;

comment on function public.get_active_announcements() is
  'Student read path for announcements. Campus scope is computed server-side from the caller''s profile; never trusts a client parameter. Never returns published_by.';

revoke all on function public.get_active_announcements() from public;
revoke all on function public.get_active_announcements() from anon;
grant execute on function public.get_active_announcements() to authenticated;
