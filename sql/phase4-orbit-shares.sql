-- =====================================================================
-- Phase 4 — Orbit: post share tracking (REQUIRED MIGRATION, NOT APPLIED)
-- Status: PROPOSAL — awaiting owner approval. Nothing in this file has
-- been executed against the live database.
--
-- Purpose
--   Trending must rank posts by real social engagement: likes, comments
--   AND shares. The current schema has no share tracking: orbit_post_saves
--   is a private bookmark table and MUST NOT be treated as a share.
--
-- Smallest compatible design
--   A new table `orbit_post_shares`, modelled on the existing
--   orbit_post_likes pattern, records each user-to-user share of a post:
--     * one row per (post, sharer, recipient) — UNIQUE constraint prevents
--       duplicate counting when the same post is shared twice to the same
--       person (a second share is still sent as a chat message; the row
--       is simply deduplicated by ON CONFLICT).
--     * share_count for trending = count of rows per post (query-side,
--       same pattern as like_count today).
--   No columns are added to orbit_feed; no existing table is altered;
--   no existing data is touched.
--
-- Authorization model (mirrors existing orbit RLS exactly)
--   * INSERT  — only the authenticated sharer (shared_by = auth.uid()),
--               and only for an ACTIVE post on their own campus
--               (orbit_current_campus(), same qual as orbit likes/saves).
--               The actual delivery goes through the existing `messages`
--               INSERT policy, which independently enforces conversation
--               membership, admin.user_allowed(uid,'message'), the
--               blocks table (both directions), and the write rate limit
--               (60/hr). Share rows are bookkeeping on top of a message
--               that was already authorized.
--   * SELECT  — same-campus read, identical to orbit_likes_read_same_campus,
--               needed so clients can count shares for trending.
--   * No client UPDATE/DELETE policies — rows are immutable facts.
--
-- Rate limiting
--   Shares ride the messages rate limit (a share is a message). This table
--   is intentionally NOT added to admin.consume_write_rate_limit to avoid
--   double-charging the same user action.
--
-- Realtime
--   Not added to supabase_realtime (like/comment counts are not realtime
--   today either); share counts appear on the next feed load.
--
-- Rollback (drops the table and its data — share history only)
--   drop table if exists public.orbit_post_shares;
-- =====================================================================

create table if not exists public.orbit_post_shares (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.orbit_feed(id) on delete cascade,
  shared_by  uuid not null references auth.users(id) on delete cascade,
  shared_to  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, shared_by, shared_to)
);

alter table public.orbit_post_shares enable row level security;

create policy orbit_shares_insert_own
  on public.orbit_post_shares
  for insert
  with check (
    shared_by = auth.uid()
    and exists (
      select 1 from public.orbit_feed f
      where f.id = post_id
        and f.school_tag = public.orbit_current_campus()
        and f.status = 'active'
    )
  );

create policy orbit_shares_read_same_campus
  on public.orbit_post_shares
  for select
  using (
    exists (
      select 1 from public.orbit_feed f
      where f.id = post_id
        and f.school_tag = public.orbit_current_campus()
        and f.status = 'active'
    )
  );
