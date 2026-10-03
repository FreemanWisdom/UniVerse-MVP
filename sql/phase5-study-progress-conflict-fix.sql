-- UniVerse ICOS — Phase 5 validation hotfix
-- study_record_resource_open: ON CONFLICT target does not match any unique index
--
-- FOUND (Oct 2 2026, live-verified):
--   study_record_resource_open() upserts into study_progress with
--     ON CONFLICT (user_id, course_id)
--   but the table's uniqueness is enforced by the EXPRESSION index
--     study_progress_user_course_unique_idx (user_id, COALESCE(course_id, '000…0'))
--   → PostgreSQL raises 42P10 "no unique or exclusion constraint matching the
--   ON CONFLICT specification" on EVERY call, for every user, on every campus.
--   The study-resource-access edge function masks this as
--   403 resource_not_accessible, so Open/Download fails for all students.
--   This is a PRE-EXISTING bug (new UI and legacy dashboard both affected),
--   surfaced by Phase 5 validation. Not caused by any Phase 5 change.
--
-- FIX (narrowest possible): match the conflict target to the existing index
--   expression. No schema change, no data change, no index change, no RLS
--   change. Behavior with NULL course_id is handled by the COALESCE index
--   exactly as the index designer intended.
--
-- VERIFIED BEFORE APPLYING (simulated JWT as authenticated user, rolled back):
--   insert … on conflict (user_id, COALESCE(course_id, '000…0')) → insert-ok
--
-- APPROVAL: pending owner (Freeman). Do NOT apply without approval.
--
-- ROLLBACK: re-run the second statement below (original body restored).

-- === APPLY (with owner approval) ===
CREATE OR REPLACE FUNCTION public.study_record_resource_open(p_resource_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_course_id uuid;
begin
  if not exists (select 1 from public.study_resources r where r.id=p_resource_id and r.university=public.study_current_university()) then
    raise exception 'resource_not_accessible';
  end if;
  select course_id into v_course_id from public.study_resources where id=p_resource_id;
  insert into public.study_recent_activity(user_id, resource_id, opened_at) values(auth.uid(),p_resource_id,now())
    on conflict (user_id,resource_id) do update set opened_at=excluded.opened_at;
  insert into public.study_progress(user_id,course_id,resources_opened,last_resource_id,last_opened_at,updated_at)
    values(auth.uid(),v_course_id,1,p_resource_id,now(),now())
    on conflict (user_id, COALESCE(course_id, '00000000-0000-0000-0000-000000000000'::uuid))
    do update set resources_opened=public.study_progress.resources_opened+1,
      last_resource_id=excluded.last_resource_id,
      last_opened_at=excluded.last_opened_at,
      updated_at=now();
end;
$function$;

-- === ROLLBACK ===
-- CREATE OR REPLACE FUNCTION public.study_record_resource_open(p_resource_id uuid)
--  RETURNS void
--  LANGUAGE plpgsql
--  SET search_path TO 'public'
-- AS $function$
-- declare
--   v_course_id uuid;
-- begin
--   if not exists (select 1 from public.study_resources r where r.id=p_resource_id and r.university=public.study_current_university()) then
--     raise exception 'resource_not_accessible';
--   end if;
--   select course_id into v_course_id from public.study_resources where id=p_resource_id;
--   insert into public.study_recent_activity(user_id, resource_id, opened_at) values(auth.uid(),p_resource_id,now())
--     on conflict (user_id,resource_id) do update set opened_at=excluded.opened_at;
--   insert into public.study_progress(user_id,course_id,resources_opened,last_resource_id,last_opened_at,updated_at)
--     values(auth.uid(),v_course_id,1,p_resource_id,now(),now())
--     on conflict (user_id,course_id) do update set resources_opened=public.study_progress.resources_opened+1,last_resource_id=excluded.last_resource_id,last_opened_at=excluded.last_opened_at,updated_at=now();
-- end;
-- $function$;
