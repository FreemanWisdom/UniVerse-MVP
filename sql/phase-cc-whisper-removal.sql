-- Phase CC: whisper removal in admin_moderate_report
-- Approved by Freeman via Antigravity handoff, Sept 28 2026. APPLIED LIVE via
-- management API after review; live-verified: report resolved, whisper hidden
-- from feed, audit row written, non-admin blocked.
-- Surgical CREATE OR REPLACE of public.admin_moderate_report:
--   adds 'whisper' branch to the remove action (soft-delete via is_deleted=true)
--   adds an else-guard (unsupported_content_type) so unknown content types raise
--   instead of silently resolving
-- Everything else identical to the live definition (incl. report_not_found check,
-- updated_at stamps, audit trail, SECURITY DEFINER, search_path).

CREATE OR REPLACE FUNCTION public.admin_moderate_report(p_report_id uuid, p_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'admin', 'public', 'pg_catalog'
AS $function$
declare
  r public.reports%rowtype;
begin
  if not admin.is_admin() then
    raise exception 'admin_access_required';
  end if;

  select * into r from public.reports where id = p_report_id for update;

  if not found then
    raise exception 'report_not_found';
  end if;

  if p_action = 'dismiss' then
    update public.reports set status = 'dismissed', reviewed_by = auth.uid(), reviewed_at = now() where id = p_report_id;
  elsif p_action = 'remove' then
    if r.content_type = 'orbit_post' then
      update public.orbit_feed set status = 'removed', updated_at = now() where id = r.content_id;
    elsif r.content_type = 'orbit_comment' then
      update public.orbit_comments set deleted_at = now(), updated_at = now() where id = r.content_id;
    elsif r.content_type = 'whisper' then
      update public.whisper_posts set is_deleted = true where id = r.content_id;
    else
      raise exception 'unsupported_content_type';
    end if;
    
    update public.reports set status = 'resolved', reviewed_by = auth.uid(), reviewed_at = now() where id = p_report_id;
  else
    raise exception 'invalid_moderation_action';
  end if;

  perform admin.write_audit(
    'moderate_report',
    'report',
    p_report_id::text,
    p_action,
    jsonb_build_object('content_type', r.content_type, 'content_id', r.content_id)
  );
  
  return jsonb_build_object('ok', true);
end;$function$;
