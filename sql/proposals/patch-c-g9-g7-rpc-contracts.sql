-- ============================================================================
-- PATCH C (G9 + G7): RPC contract fixes — orbit report resolution and
--                     announcement publishing
-- Status: PROPOSAL — REVIEW ONLY. DO NOT APPLY TO PRODUCTION WITHOUT APPROVAL.
-- Repo: my-new-feature @ 7ed4b1f · Prepared Oct 14 2026
-- ----------------------------------------------------------------------------
-- G9 BUG (verified live Oct 13 2026, fixture regression RP-4):
--   orbit_create_report stores content_type exactly as the client passes it
--   ('post' / 'comment', validated by its own guard), but
--   admin_moderate_report only handles 'orbit_post' / 'orbit_comment' /
--   'whisper'. Every student-filed orbit report therefore raises
--   unsupported_content_type on 'remove' and can never be resolved.
--
-- G9 FIX (smallest, backward compatible):
--   Normalize the stored content type inside admin_moderate_report
--   ('post'->'orbit_post', 'comment'->'orbit_comment') before branching.
--   Existing rows keep their stored values; both old ('orbit_post') and
--   new ('post') report rows resolve. No client or report-row changes.
--
-- G7 BUG (verified live Oct 13 2026, fixture regression AN-1):
--   admin_publish_announcement calls
--     admin.write_audit('publish_announcement','announcement',aid::text,
--                       jsonb_build_object('scope',p_scope))
--   with 4 args — the 4th parameter of write_audit is p_result TEXT, so the
--   metadata jsonb lands in a text slot and Postgres finds no matching
--   overload: publishing announcements fails for EVERY admin.
--
-- G7 FIX: pass 'success' explicitly and the metadata as the 5th argument,
--   matching the call pattern already used by admin_moderate_report.
--
-- Preflight assertions (run BEFORE applying; abort if any fails):
--   P-1  both functions exist in schema public:
--        select proname from pg_proc p join pg_namespace n on p.pronamespace=n.oid
--        where n.nspname='public'
--          and p.proname in ('admin_moderate_report','admin_publish_announcement');
--        -- expect exactly these two
--   P-2  the announcement body still contains the 4-arg audit call:
--        select pg_get_functiondef(p.oid) from pg_proc p
--        where p.proname='admin_publish_announcement';
--        -- expect "...aid::text,jsonb_build_object('scope',p_scope))..."
--   P-3  admin.write_audit exists with signature
--        (p_action text, p_target_type text, p_target_id text,
--         p_result text, p_metadata jsonb)
--        select pg_get_function_arguments(p.oid) from pg_proc p
--        join pg_namespace n on p.pronamespace=n.oid
--        where n.nspname='admin' and p.proname='write_audit';
--
-- ============================================================================

-- ---------- G9: admin_moderate_report with content-type normalization ----------
create or replace function public.admin_moderate_report(p_report_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = 'admin', 'public', 'pg_catalog'
as $function$
declare
  r public.reports%rowtype;
  v_type text;
begin
  if not admin.is_admin() then raise exception 'admin_access_required'; end if;
  select * into r from public.reports where id=p_report_id for update;
  if not found then raise exception 'report_not_found'; end if;
  -- G9: normalize student-filed orbit reports to the admin content types
  v_type := case r.content_type
              when 'post'    then 'orbit_post'
              when 'comment' then 'orbit_comment'
              else r.content_type
            end;
  if p_action='dismiss' then
    update public.reports set status='dismissed',reviewed_by=auth.uid(),reviewed_at=now() where id=p_report_id;
  elsif p_action='remove' then
    if v_type='orbit_post' then
      -- AMENDED Oct 14 (live apply): orbit_feed_status_check forbids status='removed';
      -- production canonical semantics (admin_moderate_content) set moderation_status.
      update public.orbit_feed set moderation_status='removed',updated_at=now() where id=r.content_id;
    elsif v_type='orbit_comment' then
      update public.orbit_comments set deleted_at=now(),updated_at=now() where id=r.content_id;
    elsif v_type='whisper' then
      update public.whisper_posts set is_deleted=true where id=r.content_id;
    else raise exception 'unsupported_content_type'; end if;
    update public.reports set status='resolved',reviewed_by=auth.uid(),reviewed_at=now() where id=p_report_id;
  else raise exception 'invalid_moderation_action'; end if;
  perform admin.write_audit('moderate_report','report',p_report_id::text,p_action,
                            jsonb_build_object('content_type',r.content_type,'content_id',r.content_id));
  return jsonb_build_object('ok',true);
end;$function$;

-- ---------- G7: admin_publish_announcement with corrected audit call ----------
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

-- ============================================================================
-- Post-migration verification (read-only, run AFTER applying):
--   V-1 (G9) as admin: file an orbit report via orbit_create_report
--        (p_content_type='post'), then admin_moderate_report(id,'remove')
--        returns ok=true; orbit_feed row's status becomes 'removed';
--        reports row becomes 'resolved'; audit row written.
--   V-2 (G9 legacy) a pre-existing report row with content_type='orbit_post'
--        still resolves (normalization is a superset).
--   V-3 (G9 whisper) create_whisper_report rows still resolve ('whisper').
--   V-4 (G9 negative) non-admin call raises admin_access_required;
--        invalid action still raises invalid_moderation_action.
--   V-5 (G7) admin_publish_announcement returns ok:true and the row lands
--        in admin.announcements with an audit record (metadata jsonb now
--        stored in metadata, not result).
--   V-6 (G7 negative) non-admin call raises admin_access_required.
-- ============================================================================
