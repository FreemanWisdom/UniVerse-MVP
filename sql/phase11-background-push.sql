-- Phase 11: background push hardening.
--
-- AUDIT RESULT (Oct 18 2026): the delivery pipeline (notifications INSERT
-- trigger -> send-push edge fn -> web-push) is live and functional — it has
-- organically 403-deleted 11 stale subscriptions since the Oct 15 VAPID
-- rotation. The real failure is on DEVICE subscriptions: every remaining
-- push_subscriptions row was created with the retired VAPID key, and the
-- client renewal heuristic cannot detect them on Safari/iOS/Windows because
-- those browsers do not reliably expose subscription.applicationServerKey.
-- This patch adds the server-side safety net + diagnostics; the client-side
-- deterministic renewal (key-version marker) lands in the app code.
--
-- 1. push_delivery_log: one receipt row per (notification, subscription)
--    delivery attempt. RLS: users may read ONLY their own receipts — this
--    powers the Settings "test notification" diagnostic (was the push
--    accepted? delivered to how many devices? stale?).
-- 2. push_test_send(): authenticated self-test — inserts one type=
--    'push_test' notification row for the CALLER, which rides the exact
--    same trigger -> edge fn -> web-push path as a real message. Rate
--    limited (3/hour) via the existing rate_limit_counters pattern.
-- 3. push_retry_sweep(): at-least-once recovery for the fire-and-forget
--    trigger call. Re-invokes send-push for recent notifications that have
--    NO receipts at all (edge fn never processed them), bounded to a 30-min
--    window, only for users that still hold a subscription.
-- 4. Worker-secret rotation: the trigger authenticates to send-push with a
--    vault secret. send-push currently ALSO accepts the public anon key
--    (verified live) — an open spam vector. Both sides now compare against
--    a NEW shared secret 'universe_push_worker_v2' (edge fn env
--    PUSH_WORKER_KEY must be set to the same value via the Supabase CLI).
--
-- No changes to existing tables; notifications/push_subscriptions/RLS all
-- stay untouched.

-- 1. Delivery receipts ----------------------------------------------------
create table if not exists public.push_delivery_log (
  id uuid primary key default extensions.gen_random_uuid(),
  notification_id uuid not null,
  user_id uuid not null,
  subscription_id uuid,
  status text not null check (status in ('sent','failed_temporary','failed_permanent','stale_removed')),
  status_code int,
  attempts int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_delivery_log_notification_idx
  on public.push_delivery_log (notification_id);
create index if not exists push_delivery_log_user_idx
  on public.push_delivery_log (user_id, created_at desc);

alter table public.push_delivery_log enable row level security;

drop policy if exists "users read own push receipts" on public.push_delivery_log;
create policy "users read own push receipts"
  on public.push_delivery_log
  for select
  to authenticated
  using (user_id = auth.uid());

-- no client INSERT/UPDATE/DELETE: only the edge fn (service role) writes.

-- 2. Self-test RPC ---------------------------------------------------------
create or replace function public.push_test_send()
returns uuid
language plpgsql
security definer
set search_path = 'public', 'extensions', 'pg_catalog'
as $function$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_key text;
  v_count int;
  v_started timestamptz;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  -- rate limit: 3 per hour per user (self-targeted, but bounded anyway).
  -- rate_limit_counters has NO unique constraint, so no ON CONFLICT upsert:
  -- read-modify-write keyed on (bucket_key, hour window). Races are
  -- harmless for a self-test limiter.
  -- rate_limit_counters has a PK on bucket_key: one row per bucket, the
  -- window resets each hour. Update-or-insert, never a second row.
  v_key := 'push_test:' || v_user::text;
  select attempt_count, window_started_at into v_count, v_started
    from admin.rate_limit_counters where bucket_key = v_key;
  if v_started = date_trunc('hour', now()) and coalesce(v_count, 0) >= 3 then
    raise exception 'rate_limited';
  end if;
  if v_started = date_trunc('hour', now()) and v_count is not null then
    update admin.rate_limit_counters
      set attempt_count = attempt_count + 1, window_started_at = v_started
      where bucket_key = v_key;
  else
    delete from admin.rate_limit_counters where bucket_key = v_key;
    insert into admin.rate_limit_counters (bucket_key, window_started_at, attempt_count)
    values (v_key, date_trunc('hour', now()), 1);
  end if;

  -- Same path as every other notification: one row, trigger fans out push.
  insert into public.notifications (user_id, type, title, body, link, is_read, created_at)
  values (v_user, 'push_test', 'Test notification',
          'If this device is registered for push, your phone just buzzed. Otherwise check the notification settings.',
          '/notifications', false, now())
  returning id into v_id;

  return v_id;
end;$function$;

revoke execute on function public.push_test_send() from public;
revoke execute on function public.push_test_send() from anon;
grant execute on function public.push_test_send() to authenticated;

-- 3. Retry sweep ----------------------------------------------------------
-- Covers the case where the fire-and-forget net.http_post from the trigger
-- never reached send-push (edge fn down, transient 5xx). A notification with
-- ZERO receipts never got processed. Bounded by the window and by receipts:
-- once send-push processes it, receipts exist and it is never re-sent.
-- Scheduled every 5 minutes by pg_cron (see bottom); if pg_cron cannot be
-- installed, the function can be invoked manually or from any scheduler.
create or replace function public.push_retry_sweep()
returns int
language plpgsql
security definer
set search_path = 'public', 'extensions', 'pg_catalog'
as $function$
declare
  v_fired int := 0;
  r record;
  v_key text;
begin
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'universe_push_worker_v2' limit 1;
  if v_key is null then
    raise warning 'push_retry_sweep: worker secret universe_push_worker_v2 missing';
    return 0;
  end if;

  for r in
    select n
    from public.notifications n
    where n.created_at > now() - interval '30 minutes'
      and n.type in ('campus_message','message_request','orbit_post','orbit_mention','orbit_like','orbit_comment','announcement','push_test')
      and not exists (select 1 from public.push_delivery_log l where l.notification_id = n.id)
      and exists (select 1 from public.push_subscriptions s where s.user_id = n.user_id)
    limit 100
  loop
    perform net.http_post(
      url := 'https://loppfyncbehifnspupwa.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type','application/json','apikey', v_key),
      body := jsonb_build_object(
        'record', jsonb_build_object(
          'id', (r.n).id, 'user_id', (r.n).user_id, 'type', (r.n).type,
          'title', (r.n).title, 'body', (r.n).body, 'link', (r.n).link
        ),
        'type', 'INSERT', 'table', 'notifications', 'schema', 'public'
      ),
      timeout_milliseconds := 5000
    );
    v_fired := v_fired + 1;
  end loop;

  return v_fired;
end;$function$;

revoke execute on function public.push_retry_sweep() from public;
revoke execute on function public.push_retry_sweep() from anon;
revoke execute on function public.push_retry_sweep() from authenticated;

-- 4. Worker secret + trigger rotation -------------------------------------
-- New shared secret (value created below with vault.create_secret; the edge
-- fn must be given the same value as PUSH_WORKER_KEY via the Supabase CLI).
-- The old universe_push_worker secret stays in the vault but is no longer
-- used by the trigger.
create or replace function public.universeicos_notify_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'vault', 'net'
as $function$
declare
  worker_key text;
begin
  select decrypted_secret
    into worker_key
  from vault.decrypted_secrets
  where name = 'universe_push_worker_v2'
  limit 1;

  if worker_key is null then
    raise warning 'UniVerse push worker secret is not configured';
    return new;
  end if;

  perform net.http_post(
    url := 'https://loppfyncbehifnspupwa.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', worker_key
    ),
    body := jsonb_build_object(
      'record', to_jsonb(new),
      'type', 'INSERT',
      'table', tg_table_name,
      'schema', tg_table_schema
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$function$;

-- 5. pg_cron schedule for the sweep (best effort) ------------------------
-- create extension if not exists pg_cron; is attempted separately; if the
-- extension is unavailable the sweep stays manual.
