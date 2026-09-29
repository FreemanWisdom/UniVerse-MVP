# Phase 5D — Write-Path Rate Limits (Design, pending owner approval)

Status: DESIGNED, NOT APPLIED. No database change has been made. This document
proposes the change and includes the full migration SQL for review.

## Scope decision (Freeman, Sept 29 2026)

Verification paths are already rate-limited (edge functions + DB counters,
live-verified in the 5A audit). This phase covers the student write paths that
have NO limits today:

| Table | Client write | uid column | Existing guards |
|---|---|---|---|
| orbit_feed | new UI composer | poster_id | RLS + user_allowed('post') |
| messages | chat send | sender_id | RLS + user_allowed('message') |
| study_resources | study upload | uploader_id | RLS + user_allowed('upload') |
| tribe_posts | tribe post | author_id | RLS + user_allowed('post') |
| whisper_posts | whisper create | author_id | trigger enforce_whisper_write |
| market / hustles / lodges | marketplace | poster_id | RLS + user_allowed('marketplace') |

Live DB, verified today: no rate objects exist for any of these; pg_cron is NOT
installed; the only rate-limit pattern in the platform is the verification
fixed-window counter (`private.verification_rate_limits` +
`consume_verification_rate_limit`) — proven in production.

## Design

Reuse the proven fixed-window counter pattern, generalized to write tables and
enforced by DB triggers (cannot be bypassed by any client path, unlike a
frontend or RPC-level check).

**Objects (all in `admin` schema — not exposed via PostgREST, invisible to clients):**

1. `admin.write_rate_limits` — config table, one row per gated table.
   Owner can retune or disable a limit with an UPDATE, no redeploy, no code change.
   `table_name PK, action text, uid_column text, max_events int, window_seconds int, is_active bool default true`.
2. `admin.rate_limit_counters` — `bucket_key PK, window_started_at, attempt_count`.
   One row per (user, action) forever — bounded by user count, no pruning, no pg_cron needed.
3. `admin.consume_write_rate_limit()` — SECURITY DEFINER generic BEFORE INSERT trigger fn:
   - looks up the config row by `TG_TABLE_NAME`; **fail-open if none** (rate limiting is an
     anti-abuse guardrail, not a security boundary — the capability gates already provide
     security; a missing/misconfigured row must not brick writes),
   - extracts the actor from `to_jsonb(NEW) ->> uid_column`,
   - exempts admins (`admin.is_admin()`),
   - consumes the counter (upsert with window reset, same logic as the verification fn),
   - raises with a human-readable message including retry minutes when over limit.
4. One `BEFORE INSERT` trigger (`admin_write_rate_limit`) per gated table. BEFORE triggers
   fire before RLS WITH CHECK evaluation, so blocked inserts fail with the clear
   rate-limit message instead of an RLS 403.

**Proposed defaults** (tunable via config UPDATE):

| Table | Limit |
|---|---|
| orbit_feed | 20 / hour |
| messages | 60 / hour |
| study_resources | 10 / hour |
| tribe_posts | 20 / hour |
| whisper_posts | 20 / hour |
| market, hustles, lodges | 10 / hour |

**Intentionally out of scope:** UPDATE/DELETE limits (no spam vector), admin console
actions (admin_moderate_* are UPDATEs by admins, exempt anyway), edge-function
verification limits (already done).

## Failure behavior

- Over limit → exception `rate_limit_exceeded` with message like
  `Too many posts — try again in 37 minutes.` → PostgREST 400 → existing client
  catch blocks surface the message verbatim (composer already shows error text).
- No config row → insert proceeds (fail-open, logged decision).
- Admin/super_admin actor → exempt.
- Admin moderation (hide/restore) is UPDATE-only → unaffected.
- Realtime/notifications unaffected.

## Draft migration (NOT applied)

```sql
-- Phase 5D: write-path rate limits
-- PROPOSED — not applied. Rollback at bottom.

create table if not exists admin.write_rate_limits (
  table_name     text primary key,
  action         text not null,
  uid_column     text not null,
  max_events     int  not null,
  window_seconds int  not null default 3600,
  is_active      bool not null default true
);

create table if not exists admin.rate_limit_counters (
  bucket_key       text primary key,
  window_started_at timestamptz not null default now(),
  attempt_count    int not null default 0
);

create or replace function admin.consume_write_rate_limit()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'admin'
as $$
declare
  cfg  record;
  uid  uuid;
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

create trigger admin_write_rate_limit
  before insert on public.orbit_feed
  for each row execute function admin.consume_write_rate_limit();
create trigger admin_write_rate_limit
  before insert on public.messages
  for each row execute function admin.consume_write_rate_limit();
create trigger admin_write_rate_limit
  before insert on public.study_resources
  for each row execute function admin.consume_write_rate_limit();
create trigger admin_write_rate_limit
  before insert on public.tribe_posts
  for each row execute function admin.consume_write_rate_limit();
create trigger admin_write_rate_limit
  before insert on public.whisper_posts
  for each row execute function admin.consume_write_rate_limit();
create trigger admin_write_rate_limit
  before insert on public.market
  for each row execute function admin.consume_write_rate_limit();
create trigger admin_write_rate_limit
  before insert on public.hustles
  for each row execute function admin.consume_write_rate_limit();
create trigger admin_write_rate_limit
  before insert on public.lodges
  for each row execute function admin.consume_write_rate_limit();

insert into admin.write_rate_limits (table_name, action, uid_column, max_events) values
  ('orbit_feed',      'post',  'poster_id',   20),
  ('messages',        'message','sender_id',   60),
  ('study_resources', 'upload', 'uploader_id', 10),
  ('tribe_posts',     'post',  'author_id',    20),
  ('whisper_posts',   'whisper','author_id',   20),
  ('market',          'market','poster_id',    10),
  ('hustles',         'hustle','poster_id',    10),
  ('lodges',          'lodge', 'poster_id',    10);

-- Rollback:
-- drop trigger admin_write_rate_limit on public.orbit_feed;  (x8 tables)
-- drop function admin.consume_write_rate_limit();
-- drop table admin.rate_limit_counters;
-- drop table admin.write_rate_limits;
```

## Verification plan (after approval)

1. Simulated-JWT: 21st orbit insert in an hour raises `rate_limit_exceeded`;
   messages still allowed (separate bucket).
2. Browser e2e: composer post #1 succeeds; set config max to 1, post #2 shows
   the friendly message; restore max to 20.
3. Admin exemption: simulated-JWT admin insert passes despite exhausted bucket.
4. Fail-open: config row deleted → insert passes.
5. Cleanup throwaways; confirm counter rows bounded (1 per user+action).
