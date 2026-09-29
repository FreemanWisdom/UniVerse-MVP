-- Phase 5D: write-path rate limits
-- Applied live: 2026-09-29 (owner-approved "go ahead"/"continue" in chat)
-- Design: docs/phase5d-write-rate-limits.md (commit 611b369)
--
-- Pattern: generalizes the proven verification fixed-window counter
-- (private.verification_rate_limits) to student write tables, enforced by
-- BEFORE INSERT triggers (DB-level, no client path can bypass).
--
-- Semantics (all live-verified):
--   * config row missing  -> insert proceeds (FAIL-OPEN, deliberate:
--     anti-abuse guardrail, not a security boundary; capability gates handle security)
--   * admin/super_admin actor (admin.is_admin()) -> exempt
--   * per (user, action) fixed window; counter row persists, bounded by user count
--   * over limit -> P0001 'rate_limit_exceeded: too many <action> writes —
--     try again in N minutes' -> PostgREST 400; frontend surfaces the message
--   * BEFORE triggers fire before RLS WITH CHECK and before FK checks
--   * admin moderation (hide/restore) is UPDATE-only -> unaffected
--   * no pg_cron needed: counters never grow (1 row per user+action)
--
-- Verified (simulated JWT + postgres + browser e2e):
--   limit hit raises with retry minutes; buckets isolated per action;
--   admin exemption; fail-open on missing config; browser composer shows
--   'too many post writes — try again in N minutes' (frontend commit alongside).

create table if not exists admin.write_rate_limits (
  table_name     text primary key,
  action         text not null,
  uid_column     text not null,
  max_events     int  not null,
  window_seconds int  not null default 3600,
  is_active      bool not null default true
);

create table if not exists admin.rate_limit_counters (
  bucket_key        text primary key,
  window_started_at timestamptz not null default now(),
  attempt_count     int not null default 0
);

create or replace function admin.consume_write_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'admin'
as $$
declare
  cfg record;
  uid uuid;
  started timestamptz;
  count int;
begin
  select * into cfg from admin.write_rate_limits
    where table_name = tg_table_name and is_active;
  if not found then return new; end if;           -- fail-open
  uid := (to_jsonb(new) ->> cfg.uid_column)::uuid;
  if uid is null then return new; end if;          -- non-user rows pass
  if admin.is_admin() then return new; end if;      -- admins exempt

  insert into admin.rate_limit_counters (bucket_key, window_started_at, attempt_count)
  values (cfg.action || ':' || uid, now(), 1)
  on conflict (bucket_key) do update set
    window_started_at = case when now() - rate_limit_counters.window_started_at
                               >= make_interval(secs => cfg.window_seconds)
                          then now() else rate_limit_counters.window_started_at end,
    attempt_count = case when now() - rate_limit_counters.window_started_at
                               >= make_interval(secs => cfg.window_seconds)
                          then 1 else rate_limit_counters.attempt_count + 1 end
  returning window_started_at, attempt_count into started, count;

  if count > cfg.max_events then
    raise exception 'rate_limit_exceeded: too many % writes — try again in % minutes',
      cfg.action, ceil(extract(epoch from (started
        + make_interval(secs => cfg.window_seconds) - now())) / 60)::int;
  end if;
  return new;
end;
$$;

create trigger admin_write_rate_limit before insert on public.orbit_feed
  for each row execute function admin.consume_write_rate_limit();
create trigger admin_write_rate_limit before insert on public.messages
  for each row execute function admin.consume_write_rate_limit();
create trigger admin_write_rate_limit before insert on public.study_resources
  for each row execute function admin.consume_write_rate_limit();
create trigger admin_write_rate_limit before insert on public.tribe_posts
  for each row execute function admin.consume_write_rate_limit();
create trigger admin_write_rate_limit before insert on public.whisper_posts
  for each row execute function admin.consume_write_rate_limit();
create trigger admin_write_rate_limit before insert on public.market
  for each row execute function admin.consume_write_rate_limit();
create trigger admin_write_rate_limit before insert on public.hustles
  for each row execute function admin.consume_write_rate_limit();
create trigger admin_write_rate_limit before insert on public.lodges
  for each row execute function admin.consume_write_rate_limit();

insert into admin.write_rate_limits (table_name, action, uid_column, max_events) values
  ('orbit_feed',      'post',    'poster_id',   20),
  ('messages',        'message', 'sender_id',   60),
  ('study_resources', 'upload',  'uploader_id', 10),
  ('tribe_posts',     'post',    'author_id',   20),
  ('whisper_posts',   'whisper', 'author_id',   20),
  ('market',          'market',  'poster_id',   10),
  ('hustles',         'hustle',  'poster_id',   10),
  ('lodges',          'lodge',   'poster_id',   10);

-- Rollback:
-- drop trigger admin_write_rate_limit on public.orbit_feed;
-- drop trigger admin_write_rate_limit on public.messages;
-- drop trigger admin_write_rate_limit on public.study_resources;
-- drop trigger admin_write_rate_limit on public.tribe_posts;
-- drop trigger admin_write_rate_limit on public.whisper_posts;
-- drop trigger admin_write_rate_limit on public.market;
-- drop trigger admin_write_rate_limit on public.hustles;
-- drop trigger admin_write_rate_limit on public.lodges;
-- drop function admin.consume_write_rate_limit();
-- drop table admin.rate_limit_counters;
-- drop table admin.write_rate_limits;
