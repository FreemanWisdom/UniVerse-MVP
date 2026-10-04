-- UniVerse ICOS — Phase 8: Study Tribe join-request approval
-- Feature (Freeman, Oct 4 2026): joining a tribe requires the tribe creator
-- to accept the member. Previously joining was an instant one-click upsert.
--
-- DESIGN (minimal-risk, preserves all existing backend/RLS):
--   * NEW table only — tribes, tribe_members, tribe_posts untouched.
--     A pending requester has NO tribe_members row, so every existing
--     membership check and RLS policy keeps working unchanged and stays
--     secure by default.
--   * tribe_join_requests rows are visible only to the requester and the
--     tribe creator. creator_id never reaches the client (RPC returns
--     requester names instead — same pattern as admin_list_admins, Phase 7).
--   * Decline = creator deletes the pending row (student may re-request
--     later). Accept = SECURITY DEFINER RPC: creator-gated, atomic
--     (insert member + mark accepted in one transaction).
--   * Re-request after leaving (accepted row exists, not a member):
--     client upsert resets the row to pending (UPDATE policy is own-rows,
--     accepted-status only).
--   * Write rate limit: reuses the Phase 5D generic trigger
--     admin.consume_write_rate_limit with its own config row (10/hour).
--     Fail-open if the config row is missing (5D behavior).
--
-- APPROVAL: requested by Freeman ("the creator of the tribe has to accept
-- the members"), applied Oct 4 2026.
--
-- ROLLBACK: run the ROLLBACK section at the bottom of this file.

-- === APPLY ===

create table if not exists public.tribe_join_requests (
  id uuid primary key default gen_random_uuid(),
  tribe_id uuid not null references public.tribes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (tribe_id, user_id)
);

alter table public.tribe_join_requests enable row level security;
alter table public.tribe_join_requests force row level security;

-- Requesters see their own rows (any status) so the UI can show
-- "Requested" state and allow cancel/re-request.
create policy "requesters see own join requests"
  on public.tribe_join_requests for select
  to authenticated
  using (user_id = auth.uid());

-- Creators see requests for their tribes (read-only; decisions go
-- through the RPC / delete policies below).
create policy "tribe creator sees join requests"
  on public.tribe_join_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.tribes t
      where t.id = tribe_join_requests.tribe_id
        and t.creator_id = auth.uid()
    )
  );

-- GOTCHA: the "no duplicate pending request" check cannot query
-- tribe_join_requests inside its own INSERT policy (42P17 infinite
-- recursion). It goes through this SECURITY DEFINER helper instead,
-- which bypasses the table's RLS.
create or replace function public.tribe_has_pending_request(p_tribe_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = 'public'
as $function$
  select exists (
    select 1 from public.tribe_join_requests r
    where r.tribe_id = p_tribe_id and r.user_id = p_user_id and r.status = 'pending'
  );
$function$;

-- Same-campus students may request to join, unless they are already a
-- member (covers the creator, who is inserted as a member at creation)
-- or already have a pending request.
create policy "same-campus students can request to join"
  on public.tribe_join_requests for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.tribes t
      where t.id = tribe_join_requests.tribe_id
        and t.university = public.study_current_university()
        and t.moderation_status = 'active'
    )
    and not exists (
      select 1 from public.tribe_members m
      where m.tribe_id = tribe_join_requests.tribe_id
        and m.user_id = auth.uid()
    )
    and not public.tribe_has_pending_request(tribe_join_requests.tribe_id, auth.uid())
  );

-- A former member (accepted row, but no longer in tribe_members) may
-- reset their request to pending. Nobody else can update anything.
create policy "former members can re-request"
  on public.tribe_join_requests for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and not exists (
      select 1 from public.tribe_members m
      where m.tribe_id = tribe_join_requests.tribe_id
        and m.user_id = auth.uid()
    )
  );

-- Requester may cancel their own pending request.
create policy "requesters can cancel own pending requests"
  on public.tribe_join_requests for delete
  to authenticated
  using (user_id = auth.uid() and status = 'pending');

-- Creator may decline (delete) a pending request.
create policy "tribe creator can decline pending requests"
  on public.tribe_join_requests for delete
  to authenticated
  using (
    status = 'pending'
    and exists (
      select 1 from public.tribes t
      where t.id = tribe_join_requests.tribe_id
        and t.creator_id = auth.uid()
    )
  );

-- Creator's decision: accept. SECURITY DEFINER so the member insert +
-- request update happen atomically; gated on the caller being the
-- creator of that tribe and the request still being pending.
create or replace function public.tribe_accept_join_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_tribe uuid;
  v_user uuid;
begin
  select tribe_id, user_id into v_tribe, v_user
  from public.tribe_join_requests
  where id = p_request_id and status = 'pending';

  if v_user is null then
    raise exception 'request_not_found';
  end if;

  if not exists (
    select 1 from public.tribes t
    where t.id = v_tribe and t.creator_id = auth.uid()
  ) then
    raise exception 'not_tribe_creator';
  end if;

  insert into public.tribe_members (tribe_id, user_id, role)
  values (v_tribe, v_user, 'member')
  on conflict (tribe_id, user_id) do nothing;

  update public.tribe_join_requests
  set status = 'accepted', decided_at = now()
  where id = p_request_id;
end;
$function$;

grant execute on function public.tribe_accept_join_request(uuid) to authenticated;

-- Creator's request list with requester names (server-side join so
-- creator_id / any private data never reaches the client through this path).
-- Non-creators get {"is_creator": false, "requests": []}.
create or replace function public.tribe_list_join_requests(p_tribe_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_is_creator boolean;
  v_requests jsonb;
begin
  select exists (
    select 1 from public.tribes t
    where t.id = p_tribe_id and t.creator_id = auth.uid()
  ) into v_is_creator;

  if not v_is_creator then
    return jsonb_build_object('is_creator', false, 'requests', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'user_id', r.user_id,
    'full_name', p.full_name,
    'requested_at', r.requested_at
  ) order by r.requested_at asc), '[]'::jsonb)
  into v_requests
  from public.tribe_join_requests r
  left join public.profiles p on p.id = r.user_id
  where r.tribe_id = p_tribe_id and r.status = 'pending';

  return jsonb_build_object('is_creator', true, 'requests', v_requests);
end;
$function$;

grant execute on function public.tribe_list_join_requests(uuid) to authenticated;

-- Write rate limit (Phase 5D pattern): 10 join requests per hour.
insert into admin.write_rate_limits (table_name, action, uid_column, max_events)
select 'tribe_join_requests', 'request', 'user_id', 10
where not exists (
  select 1 from admin.write_rate_limits
  where table_name = 'tribe_join_requests' and action = 'request'
);

create trigger tribe_join_requests_rate_limit
  before insert on public.tribe_join_requests
  for each row execute function admin.consume_write_rate_limit();

-- === ROLLBACK ===
-- drop function if exists public.tribe_has_pending_request(uuid, uuid);
-- drop trigger if exists tribe_join_requests_rate_limit on public.tribe_join_requests;
-- delete from admin.write_rate_limits where table_name = 'tribe_join_requests' and action = 'request';
-- revoke execute on function public.tribe_list_join_requests(uuid) from authenticated;
-- drop function if exists public.tribe_list_join_requests(uuid);
-- revoke execute on function public.tribe_accept_join_request(uuid) from authenticated;
-- drop function if exists public.tribe_accept_join_request(uuid);
-- drop table if exists public.tribe_join_requests;
