-- Rollback for phase10-announcement-notifications.sql:
-- restores admin_publish_announcement to the pre-phase-10 definition
-- (no notification fan-out). Existing announcement notification rows
-- remain (they are ordinary notification rows; recipients can dismiss
-- them normally).

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

drop function if exists public.admin_publish_announcement(text, text, text);
