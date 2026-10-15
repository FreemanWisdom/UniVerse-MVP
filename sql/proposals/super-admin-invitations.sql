-- ============================================================================
-- UniVerse ICOS — Super Admin invitation flow (PROPOSAL, NOT APPLIED)
-- ============================================================================
-- STATUS: APPLIED (Oct 15 2026). APPLIED to production Oct 15 2026 and live-verified (INV-1..12). Runtime fixes during verification: rate helper column window_started_at; extensions.gen_random_bytes qualification; write_audit ::text casts + jsonb metadata; anon+PUBLIC execute revoked from list RPC.
-- Scrolling / Super Admin Invitations milestone. Blocked on applying: the
-- Supabase management access token expired mid-session; this file applies
-- ONLY after a live read-only preflight (see PREFLIGHT) and owner go-ahead.
--
-- WHAT THIS ADDS
--   1. Table admin.super_admin_invitations — invitee email (bound), inviter,
--      sha256 token hash (raw token NEVER stored), status pending/accepted/
--      revoked, expiry, acceptance metadata. RLS enabled with NO policies and
--      no client grants: every read/write goes through the RPCs below.
--   2. admin_create_super_admin_invitation(p_email) — SECURITY DEFINER.
--      Caller must hold an ACTIVE super_admin membership (same gate as
--      admin_grant_role). Generates a 64-hex-char crypto-random token,
--      stores ONLY its sha256 hash, returns the raw token exactly once to
--      the calling API route (which emails it and never logs it). Refuses
--      duplicate pending invitations for the same email, refuses emails
--      that already belong to an active super admin. Rate-limited 3/hour
--      per inviter via admin.rate_limit_counters (fixed window, same
--      semantics as admin.consume_write_rate_limit). Audited.
--   3. admin_revoke_super_admin_invitation(p_invitation_id) — SECURITY
--      DEFINER, super admin only; pending invitations only; audited.
--   4. admin_accept_super_admin_invitation(p_token) — SECURITY DEFINER.
--      Caller must be signed in AND their auth email must match the invited
--      email exactly (case-insensitive) — the emailed single-use link is the
--      email-control verification; the session-email match is the second
--      factor. Validates: hash match, status pending, not expired, not
--      revoked, caller is not already an active super admin. Marks accepted
--      (accepted_by/accepted_at) and grants the super_admin membership in
--      the SAME transaction — duplicate acceptance is impossible because
--      the status flip and the grant commit atomically. Audited
--      (super_admin_invitation_accepted). Does NOT weaken any existing
--      gate: admin.is_admin() and admin_grant_role are untouched.
--   5. admin_list_super_admin_invitations() — SECURITY DEFINER, super admin
--      only. NEVER returns token_hash. Derives effective status (a pending
--      invitation past expiry reports 'expired' without a rewrite job).
--
-- SECURITY NOTES
--   * Token: 32 bytes from gen_random_bytes (crypto-secure), hex-encoded.
--     Only sha256(token) is persisted; the raw value exists in memory of the
--     inviting API route response and in the invitee's email. Never logged.
--   * No passwords or secrets are emailed; the accept page links to the
--     existing sign-in and account-recovery flows.
--   * All EXECUTE privileges: authenticated only; anon revoked everywhere.
--   * The invitations table lives in the admin schema, which has no client
--     grants (consistent with admin.members / admin.announcements).
--
-- Rollback: sql/proposals/super-admin-invitations.rollback.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PREFLIGHT (read-only, run BEFORE applying; abort on any mismatch)
-- ----------------------------------------------------------------------------
-- P1. Confirm the environment is the intended project (loppfyncbehifnspupwa).
-- P2. Confirm admin.roles has a 'super_admin' row and admin.members is the
--     one-membership-row-per-user table (select name from admin.roles;).
-- P3. Confirm admin.rate_limit_counters + admin.write_audit exist (they do
--     since Phase 5D / ambassador; the rate-limit insert mirrors
--     admin.consume_write_rate_limit semantics).
-- P4. sha256() is a native PG11+ function (no pgcrypto dependency).

-- ----------------------------------------------------------------------------
-- MIGRATION
-- ----------------------------------------------------------------------------
begin;

-- 1) table ---------------------------------------------------------------
create table if not exists admin.super_admin_invitations (
  id            uuid primary key default gen_random_uuid(),
  invitee_email text not null,
  inviter_id    uuid not null references auth.users(id),
  token_hash    text not null unique,
  status        text not null default 'pending'
                check (status in ('pending', 'accepted', 'revoked')),
  expires_at    timestamptz not null,
  accepted_at   timestamptz,
  accepted_by   uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table admin.super_admin_invitations is
  'Super Admin invitations. Raw tokens are never stored; only sha256 hashes. All access via SECURITY DEFINER RPCs.';

alter table admin.super_admin_invitations enable row level security;
-- Deliberately NO policies and NO grants: anon and authenticated must not
-- touch this table directly; the RPCs below are the only door.
revoke all on admin.super_admin_invitations from anon, authenticated;

create index if not exists super_admin_invitations_email_idx
  on admin.super_admin_invitations (invitee_email);
create index if not exists super_admin_invitations_status_idx
  on admin.super_admin_invitations (status);

-- 2) internal helpers ------------------------------------------------------

-- _is_active_super_admin(uid): true when the user holds an ACTIVE
-- super_admin membership. Mirrors the gate used by admin_grant_role.
create or replace function admin._is_active_super_admin(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = admin, public, pg_catalog
as $$
  select exists (
    select 1
    from admin.members m
    join admin.roles r on r.id = m.role_id
    where m.user_id = p_user
      and r.name = 'super_admin'
      and m.is_active
  );
$$;

revoke execute on function admin._is_active_super_admin(uuid) from public, anon, authenticated;

-- _invitation_rate_limit(uid): fixed-window 3/hour per inviter, mirroring
-- the admin.consume_write_rate_limit semantics (fail-open on missing config
-- rows is NOT acceptable for privilege grants — fail CLOSED if the counter
-- table is unavailable... in practice the table exists; on any exception the
-- transaction aborts, which fails closed).
create or replace function admin._invitation_rate_limit(p_user uuid)
returns void
language plpgsql
security definer
set search_path = admin, pg_catalog
as $$
declare
  v_bucket text := 'create_invitation:' || p_user::text;
  v_count int;
begin
  insert into admin.rate_limit_counters (bucket_key, window_started_at, attempt_count)
  values (v_bucket, now(), 1)
  on conflict (bucket_key) do update
    set attempt_count = case
          when rate_limit_counters.window_started_at < now() - interval '1 hour' then 1
          else rate_limit_counters.attempt_count + 1
        end,
        window_started_at = case
          when rate_limit_counters.window_started_at < now() - interval '1 hour' then now()
          else rate_limit_counters.window_started_at
        end;
  select attempt_count into v_count
  from admin.rate_limit_counters where bucket_key = v_bucket;
  if v_count > 3 then
    raise exception 'rate_limit_exceeded: max 3 invitations per hour'
      using errcode = '22023';
  end if;
end;
$$;

revoke execute on function admin._invitation_rate_limit(uuid) from public, anon, authenticated;

-- 3) create invitation ----------------------------------------------------
-- Returns the RAW token exactly once (the API route emails it; the client
-- UI never sees it). Any failure raises and rolls back.
create or replace function public.admin_create_super_admin_invitation(
  p_email text
)
returns text
language plpgsql
security definer
set search_path = admin, public, pg_catalog
as $$
declare
  v_inviter uuid := auth.uid();
  v_email text := lower(btrim(p_email));
  v_token text;
  v_hash text;
begin
  -- gate: signed in AND active super admin (server-side, not UI)
  if v_inviter is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not admin._is_active_super_admin(v_inviter) then
    raise exception 'super_admin_required' using errcode = '42501';
  end if;

  -- shape check (no full RFC validation needed: delivery would fail anyway)
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  -- refuse if the target already IS an active super admin
  if exists (
    select 1
    from auth.users u
    join admin.members m on m.user_id = u.id
    join admin.roles r on r.id = m.role_id
    where lower(u.email) = v_email
      and r.name = 'super_admin'
      and m.is_active
  ) then
    raise exception 'already_super_admin' using errcode = '22023';
  end if;

  -- refuse duplicate pending invitation for the same email
  if exists (
    select 1 from admin.super_admin_invitations
    where invitee_email = v_email
      and status = 'pending'
      and expires_at > now()
  ) then
    raise exception 'duplicate_pending_invitation' using errcode = '22023';
  end if;

  -- anti-abuse: 3 invitations per hour per inviter
  perform admin._invitation_rate_limit(v_inviter);

  -- crypto-secure single-use token; store ONLY the sha256 hash
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash  := encode(sha256(convert_to(v_token, 'UTF8')), 'hex');

  insert into admin.super_admin_invitations
    (invitee_email, inviter_id, token_hash, status, expires_at)
  values
    (v_email, v_inviter, v_hash, 'pending', now() + interval '7 days');

  perform admin.write_audit(
    'super_admin_invitation_created',
    'super_admin_invitation',
    (select id from admin.super_admin_invitations where token_hash = v_hash)::text,
    'success',
    jsonb_build_object('invitee_email', v_email, 'inviter', v_inviter)
  );

  return v_token;
end;
$$;

revoke execute on function public.admin_create_super_admin_invitation(text) from public, anon;
grant execute on function public.admin_create_super_admin_invitation(text) to authenticated;

-- 4) revoke invitation ----------------------------------------------------
create or replace function public.admin_revoke_super_admin_invitation(
  p_invitation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = admin, public, pg_catalog
as $$
declare
  v_admin uuid := auth.uid();
begin
  if v_admin is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not admin._is_active_super_admin(v_admin) then
    raise exception 'super_admin_required' using errcode = '42501';
  end if;

  update admin.super_admin_invitations
  set status = 'revoked', updated_at = now()
  where id = p_invitation_id and status = 'pending';

  if not found then
    raise exception 'invitation_not_pending' using errcode = 'P0002';
  end if;

  perform admin.write_audit(
    'super_admin_invitation_revoked',
    'super_admin_invitation',
    p_invitation_id::text,
    'success',
    jsonb_build_object('revoked_by', auth.uid())
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.admin_revoke_super_admin_invitation(uuid) from public, anon;
grant execute on function public.admin_revoke_super_admin_invitation(uuid) to authenticated;

-- 5) accept invitation ----------------------------------------------------
-- The ONLY path that grants super_admin outside admin_grant_role. Requires:
-- signed-in session whose auth email matches the invited email; hash match;
-- pending; unexpired; caller not already an active super admin. The status
-- flip and the membership grant happen in ONE transaction, so acceptance is
-- single-use by construction (a replay finds status='accepted' and fails).
create or replace function public.admin_accept_super_admin_invitation(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = admin, public, pg_catalog
as $$
declare
  v_caller uuid := auth.uid();
  v_caller_email text;
  v_hash text;
  v_inv admin.super_admin_invitations%rowtype;
  v_role_id uuid;
begin
  if v_caller is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select lower(email) into v_caller_email from auth.users where id = v_caller;
  v_hash := encode(sha256(convert_to(btrim(p_token), 'UTF8')), 'hex');

  select * into v_inv
  from admin.super_admin_invitations
  where token_hash = v_hash;

  -- one generic error for unknown/used/revoked tokens: no oracle about which
  if v_inv.id is null or v_inv.status <> 'pending' then
    raise exception 'invitation_invalid_or_used' using errcode = '42501';
  end if;

  if v_inv.expires_at < now() then
    raise exception 'invitation_expired' using errcode = '22023';
  end if;

  -- email binding: only the intended verified address can accept
  if v_caller_email is distinct from v_inv.invitee_email then
    raise exception 'invitation_email_mismatch' using errcode = '42501';
  end if;

  -- no double privilege: an existing active super admin has nothing to accept
  if admin._is_active_super_admin(v_caller) then
    raise exception 'already_super_admin' using errcode = '22023';
  end if;

  select id into v_role_id from admin.roles where name = 'super_admin';
  if v_role_id is null then
    raise exception 'role_not_found' using errcode = 'P0002';
  end if;

  -- one membership row per user (established admin.members semantics):
  -- promotion replaces any existing membership row, exactly like
  -- admin_grant_role's promotion path.
  insert into admin.members (user_id, role_id, school_id, is_active)
  values (v_caller, v_role_id, null, true)
  on conflict (user_id) do update
    set role_id = excluded.role_id,
        school_id = excluded.school_id,
        is_active = true;

  update admin.super_admin_invitations
  set status = 'accepted',
      accepted_at = now(),
      accepted_by = v_caller,
      updated_at = now()
  where id = v_inv.id and status = 'pending';   -- concurrency guard

  if not found then
    raise exception 'invitation_invalid_or_used' using errcode = '42501';
  end if;

  perform admin.write_audit(
    'super_admin_invitation_accepted',
    'super_admin_invitation',
    v_inv.id::text,
    'success',
    jsonb_build_object('accepted_by', auth.uid(), 'invitee_email', v_inv.invitee_email)
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.admin_accept_super_admin_invitation(text) from public, anon;
grant execute on function public.admin_accept_super_admin_invitation(text) to authenticated;

-- 6) list invitations -----------------------------------------------------
-- Never returns token_hash. Effective status derives 'expired' on read so no
-- cron/rewrite job is needed. Super-admin-only, enforced in the RPC body.
create or replace function public.admin_list_super_admin_invitations()
returns table (
  id uuid,
  invitee_email text,
  inviter_name text,
  status text,
  effective_status text,
  created_at timestamptz,
  expires_at timestamptz,
  accepted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = admin, public, pg_catalog
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not admin._is_active_super_admin(auth.uid()) then
    raise exception 'super_admin_required' using errcode = '42501';
  end if;

  return query
  select i.id,
         i.invitee_email,
         coalesce(p.full_name, 'Admin') as inviter_name,
         i.status,
         case
           when i.status = 'pending' and i.expires_at < now() then 'expired'
           else i.status
         end,
         i.created_at,
         i.expires_at,
         i.accepted_at
  from admin.super_admin_invitations i
  join auth.users u on u.id = i.inviter_id
  left join public.profiles p on p.id = u.id
  order by i.created_at desc
  limit 200;
end;
$$;

commit;

-- ----------------------------------------------------------------------------
-- VERIFICATION (read-only, run AFTER applying; see also the browser e2e)
-- ----------------------------------------------------------------------------
-- V1. anon/anon-JWT execute on all four public RPCs → 42501.
-- V2. Non-admin authenticated JWT: create/list/revoke → super_admin_required
--     or 42501; accept with garbage token → invitation_invalid_or_used.
-- V3. Super admin JWT: create → 64-hex token returned once; list → row with
--     NO token_hash field.
-- V4. Duplicate pending for same email → duplicate_pending_invitation.
-- V5. Accept as wrong-email session → invitation_email_mismatch.
-- V6. Accept as matching-email session → ok; admin.members row is super_admin;
--     accept again with same token → invitation_invalid_or_used.
-- V7. Expired invitation (manually backdate expires_at on a fixture row):
--     accept → invitation_expired.
-- V8. Revoked invitation: accept → invitation_invalid_or_used.
-- V9. Rate limit: 4 creates within an hour → rate_limit_exceeded on the 4th.

revoke execute on function public.admin_list_super_admin_invitations() from public, anon;
