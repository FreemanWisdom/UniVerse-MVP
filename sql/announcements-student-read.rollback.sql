-- ============================================================================
-- UniVerse ICOS — ROLLBACK: student-facing announcements
-- Exact inverse of sql/announcements-student-read.sql.
-- Run order: as written. Restores the pre-change (Patch C) publish body.
-- PRECONDITION: no client build calling get_active_announcements() is live.
-- ============================================================================

-- 1. drop the student read RPC and its grants
drop function if exists public.get_active_announcements();

-- 2. restore the pre-change (Patch C) 3-arg publish body
create or replace function public.admin_publish_announcement(p_scope text, p_title text, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = 'admin', 'public', 'pg_catalog'
as $function$
declare aid uuid;
begin
  if not admin.is_admin() then raise exception 'admin_access_required'; end if;
  if length(trim(p_title))=0 or length(trim(p_body))=0 then raise exception 'announcement_required'; end if;
  insert into admin.announcements(scope,title,body,published_by) values(p_scope,trim(p_title),trim(p_body),auth.uid()) returning id into aid;
  perform admin.write_audit('publish_announcement','announcement',aid::text,'success',jsonb_build_object('scope',p_scope));
  return jsonb_build_object('ok',true,'announcement_id',aid);
end;$function$;

-- 3. recreate... (the restored body above already recreates the 3-arg
--    function; nothing else needed)

-- 4. drop the attribution columns
alter table admin.announcements
  drop constraint if exists announcements_attribution_mode_check;
alter table admin.announcements
  drop column if exists attribution_mode,
  drop column if exists display_name;
