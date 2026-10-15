-- Phase 9 rollback (matches sql/phase9-notification-welcome-survey.sql as applied).
-- NOTE: the RPC grant shipped with `revoke from anon` only; the live apply
-- also revoked from PUBLIC (which would otherwise keep it open to anon).

-- 5. Welcome emails
drop table if exists admin.welcome_emails;

-- 4. Survey admin RPC
revoke execute on function public.admin_list_survey_responses(text, integer, integer) from authenticated;
drop function if exists public.admin_list_survey_responses(text, integer, integer);

-- 3. Survey responses (DATA LOSS: deletes all survey answers)
drop policy if exists survey_responses_update_own on public.survey_responses;
drop policy if exists survey_responses_insert_own on public.survey_responses;
drop table if exists public.survey_responses;

-- 2. Notification link (restore the pre-phase-9 trigger body)
create or replace function public.universeicos_notify_message()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
declare member record;
begin
  for member in select cm.user_id from public.conversation_members cm where cm.conversation_id=new.conversation_id and cm.user_id<>new.sender_id loop
    perform public.universeicos_create_notification(member.user_id,'campus_message','New campus message',left(coalesce(new.content,''),160),'/dashboard.html',new.sender_id);
  end loop;
  return new;
end; $function$;

-- 1. Realtime publication
alter publication supabase_realtime drop table public.notifications;
