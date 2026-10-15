-- Phase 9 fixes: welcome email (1), surveys (2), notifications (3).
-- Owner: Freeman. Audited + approved via the Phase 9 task brief (Oct 15 2026).
-- Applied live to production by the orchestrator; this file records the change.
--
-- Contents:
--   1. notifications realtime publication (foreground toasts + badge).
--   2. universeicos_notify_message: notification link fix (/chat?c=<id>
--      instead of legacy /dashboard.html, which the SW truncated to "/").
--   3. survey_responses table (Phase 8 file never applied — root cause of
--      survey submission failures).
--   4. admin_list_survey_responses RPC (admin-gated reads for the console).
--   5. admin.welcome_emails (atomic idempotency claim for welcome emails).
--
-- ROLLBACK: see sql/phase9-notification-welcome-survey.rollback.sql

-- 1. Foreground notifications: enable realtime INSERT events for own rows.
alter publication supabase_realtime add table public.notifications;

-- 2. Message notifications must open the conversation, not the app root.
create or replace function public.universeicos_notify_message()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
declare member record;
begin
  for member in select cm.user_id from public.conversation_members cm where cm.conversation_id=new.conversation_id and cm.user_id<>new.sender_id loop
    perform public.universeicos_create_notification(
      member.user_id,
      'campus_message',
      'New campus message',
      left(coalesce(new.content, ''), 160),
      '/chat?c=' || new.conversation_id,
      new.sender_id
    );
  end loop;
  return new;
end; $function$;

-- 3. Survey responses storage (carried over verbatim from the Phase 8 file).
--    One response per student (UNIQUE user_id; the UI upserts). Students can
--    INSERT/UPDATE only their own row; NO client SELECT policy, so students
--    can never read anyone's answers. Admins read via the RPC below.
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  answers jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.survey_responses enable row level security;

drop policy if exists survey_responses_insert_own on public.survey_responses;
create policy survey_responses_insert_own
  on public.survey_responses
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Own-row SELECT: required for PostgREST inserts (RETURNING reads the new
-- row) and lets a student see their own submitted answers. Strictly own-row.
drop policy if exists survey_responses_select_own on public.survey_responses;
create policy survey_responses_select_own
  on public.survey_responses
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists survey_responses_update_own on public.survey_responses;
create policy survey_responses_update_own
  on public.survey_responses
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 4. Admin console reads. SECURITY DEFINER + explicit admin gate; returns
--    only safe fields (no emails/auth IDs): display name, campus, answers,
--    timestamps. Campus filter is ILIKE for search; limit/offset paginate.
create or replace function public.admin_list_survey_responses(
  p_campus text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  display_name text,
  campus text,
  answers jsonb,
  submitted_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = 'public', 'admin', 'pg_catalog'
as $function$
begin
  if not admin.is_admin() then
    raise exception 'admin_access_required' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    p_limit := 20;
  end if;
  if p_offset is null or p_offset < 0 then
    p_offset := 0;
  end if;

  return query
  select sr.id,
         coalesce(p.full_name, 'Anonymous student'),
         p.university,
         sr.answers,
         sr.created_at,
         sr.updated_at
  from public.survey_responses sr
  join public.profiles p on p.id = sr.user_id
  where p_campus is null or p.university ilike '%' || p_campus || '%'
  order by sr.created_at desc
  limit p_limit offset p_offset;
end; $function$;

revoke execute on function public.admin_list_survey_responses(text, integer, integer) from public;
revoke execute on function public.admin_list_survey_responses(text, integer, integer) from anon;
grant execute on function public.admin_list_survey_responses(text, integer, integer) to authenticated;

-- 5. Welcome-email idempotency. Inserting a row = claiming the send; the API
--    route deletes the claim on delivery failure so a retry can re-send.
--    No client grants: the admin schema stays server-side only.
create table if not exists admin.welcome_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  email text not null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  created_at timestamptz not null default now()
);

alter table admin.welcome_emails enable row level security;

-- 6. Welcome-email claim/release RPCs. The API route calls these with the
--    caller's session; both only ever touch the caller's OWN row, and the
--    claim refuses users whose email is not confirmed yet.
create or replace function public.claim_welcome_email()
returns boolean
language plpgsql
security definer
set search_path = 'admin', 'public', 'auth'
as $function$
declare
  uid uuid := auth.uid();
  v_confirmed timestamptz;
  v_email text;
begin
  if uid is null then
    return false;
  end if;
  select u.email_confirmed_at, u.email into v_confirmed, v_email
    from auth.users u where u.id = uid;
  if v_confirmed is null or v_email is null then
    -- Unverified accounts never get a welcome email.
    return false;
  end if;
  insert into admin.welcome_emails (user_id, email)
    values (uid, v_email)
    on conflict (user_id) do nothing;
  return found; -- true only for the caller that won the claim
end; $function$;

create or replace function public.release_welcome_email()
returns void
language plpgsql
security definer
set search_path = 'admin', 'public', 'auth'
as $function$
begin
  delete from admin.welcome_emails where user_id = auth.uid();
end; $function$;

revoke execute on function public.claim_welcome_email() from public;
revoke execute on function public.claim_welcome_email() from anon;
grant execute on function public.claim_welcome_email() to authenticated;
revoke execute on function public.release_welcome_email() from public;
revoke execute on function public.release_welcome_email() from anon;
grant execute on function public.release_welcome_email() to authenticated;
