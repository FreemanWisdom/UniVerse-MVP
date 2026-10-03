-- Phase 8: Survey responses storage
-- Owner: Freeman. Purpose: student feedback survey (Settings → UniVerse Survey).
-- Status: WRITTEN, NOT APPLIED — awaiting owner approval.
--
-- Contract:
--   * One response per student (UNIQUE user_id; the UI upserts, so retaking
--     the survey overwrites the previous response instead of duplicating).
--   * Students can INSERT/UPDATE only their own row. NO client SELECT policy,
--     so students can never read (or enumerate) anyone's answers.
--   * Responses are read by admins via the service role / Supabase dashboard.
--   * RLS rides on the existing default grants for INSERT/UPDATE (same
--     pattern as every other student-writable table); SELECT stays revoked
--     implicitly by having no policy for authenticated/anon.
--
-- ROLLBACK:
--   drop policy if exists survey_responses_insert_own on public.survey_responses;
--   drop policy if exists survey_responses_update_own on public.survey_responses;
--   drop table if exists public.survey_responses;

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  answers jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.survey_responses enable row level security;

create policy survey_responses_insert_own
  on public.survey_responses
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy survey_responses_update_own
  on public.survey_responses
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
