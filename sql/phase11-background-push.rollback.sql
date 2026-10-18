-- Rollback for phase11-background-push.sql:
-- drops the new table/RPCs and restores the push trigger to the
-- universe_push_worker (v1) secret. push_delivery_log data is lost;
-- notifications rows (incl. push_test rows) remain as ordinary feed rows.

drop function if exists public.push_retry_sweep();
drop function if exists public.push_test_send();
drop table if exists public.push_delivery_log;

-- restore trigger fn using the original worker secret
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
  where name = 'universe_push_worker'
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
