-- Phase 10: announcement notifications.
--
-- ROOT CAUSE (audited Oct 15 2026): admin_publish_announcement inserted the
-- announcement row + audit but NEVER created public.notifications rows.
-- The notification feed, unread count, realtime toasts and the device-push
-- trigger all key off notifications rows (message notifications are created
-- by the universeicos_notify_message trigger on messages). Nothing filtered
-- announcement records out - they were simply never created.
--
-- FIX: fan out one notification row per eligible recipient INSIDE the same
-- publish transaction:
--   * global          -> every profile
--   * campus:<name>   -> only profiles with that exact university
-- Recipient targeting is computed server-side in this SECURITY DEFINER
-- function - the client never supplies a recipient list.
--
-- Everything downstream is reused, unchanged:
--   * notifications RLS (users read/mark-read their own rows only)
--   * the notification feed query + unread count (no type filters there)
--   * supabase_realtime membership (Phase 9) -> foreground toasts + bell
--   * universeicos-notifications-push trigger -> send-push edge fn per row
--
-- actor_id is deliberately NULL: the announcements system supports
-- pseudonymous attribution; putting the publisher's uuid in actor_id would
-- leak their identity through the feed's actor profile lookup.
--
-- Idempotency: notifications are created in the SAME transaction as the
-- announcement row. A failed publish rolls back both (no orphans, no
-- partial fan-out). Each successful publish is a new announcement with its
-- own notification set; realtime events are INSERT rows, and the client
-- already dedupes rows by id in every list.
--
-- No new tables, no RLS changes, no client grants.

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
  v_recipients int;
begin
  if not admin.is_admin() then raise exception 'admin_access_required'; end if;
  if length(trim(coalesce(p_title,''))) = 0 or length(trim(coalesce(p_body,''))) = 0 then
    raise exception 'announcement_required';
  end if;

  -- scope whitelist: global (legacy 'platform' alias) or an exact campus.
  -- 'campus:' is 7 chars, so the school name starts at position 8.
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

  -- NEW: fan out notifications AFTER successful publication, in the same
  -- transaction. One row per eligible recipient, targeted server-side:
  --   global        -> every profile
  --   campus:<name> -> only profiles whose university is that exact school
  -- (mirrors get_active_announcements' scope logic, which computes campus
  -- server-side from profiles - a recipient notified for an announcement
  -- is always a recipient allowed to see it.)
  insert into public.notifications (user_id, type, title, body, link, is_read, created_at)
  select p.id,
         'announcement',
         trim(p_title),
         left(trim(p_body), 160),
         '/announcements',
         false,
         now()
  from public.profiles p
  where case when v_scope = 'global' then true
             else p.university = substr(v_scope, 8) end;
  get diagnostics v_recipients = row_count;

  return jsonb_build_object(
    'ok', true,
    'announcement_id', aid,
    'notified', v_recipients);
end;$function$;

-- The 3-arg legacy overload stays dropped (single-source publishes only).
drop function if exists public.admin_publish_announcement(text, text, text);
