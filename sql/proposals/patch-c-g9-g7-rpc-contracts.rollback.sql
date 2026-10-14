-- ============================================================================
-- PATCH C ROLLBACK (G9 + G7): restore the original function bodies
-- Run only if patch-c-g9-g7-rpc-contracts.sql was applied.
-- Independently reversible: does not depend on any other patch.
-- NOTE: rolling back re-introduces the two production bugs (orbit reports
--       unresolvable; announcements unpublishable). Data written while the
--       patched versions ran remains valid for the original bodies.
-- ============================================================================

-- original admin_moderate_report (captured from live catalog Oct 14 2026)
create or replace function public.admin_moderate_report(p_report_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = 'admin', 'public', 'pg_catalog'
as $function$
declare r public.reports%rowtype;
begin
 if not admin.is_admin() then raise exception 'admin_access_required'; end if;
 select * into r from public.reports where id=p_report_id for update;
 if not found then raise exception 'report_not_found'; end if;
 if p_action='dismiss' then update public.reports set status='dismissed',reviewed_by=auth.uid(),reviewed_at=now() where id=p_report_id;
 elsif p_action='remove' then
   if r.content_type='orbit_post' then update public.orbit_feed set status='removed',updated_at=now() where id=r.content_id;
   elsif r.content_type='orbit_comment' then update public.orbit_comments set deleted_at=now(),updated_at=now() where id=r.content_id;
   elsif r.content_type='whisper' then update public.whisper_posts set is_deleted=true where id=r.content_id;
   else raise exception 'unsupported_content_type'; end if;
   update public.reports set status='resolved',reviewed_by=auth.uid(),reviewed_at=now() where id=p_report_id;
 else raise exception 'invalid_moderation_action'; end if;
 perform admin.write_audit('moderate_report','report',p_report_id::text,p_action,jsonb_build_object('content_type',r.content_type,'content_id',r.content_id));
 return jsonb_build_object('ok',true);
end;$function$;

-- original admin_publish_announcement (captured from live catalog Oct 14 2026)
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
 perform admin.write_audit('publish_announcement','announcement',aid::text,jsonb_build_object('scope',p_scope));
 return jsonb_build_object('ok',true,'announcement_id',aid);
end;$function$;

-- Post-rollback verification:
--   R-1 pg_get_functiondef(...) for both functions matches the texts above
--      (diff against this file).
--   R-2 (known-bug confirmation) admin_publish_announcement now fails again
--      with "function admin.write_audit(text, text, text, jsonb) does not
--      exist" — expected while rolled back.
