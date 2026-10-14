-- ============================================================================
-- UniVerse ICOS — E2EE Stage 1 foundation (PROPOSAL v1)
-- ============================================================================
-- STATUS: PROPOSAL — REVIEW ONLY. DO NOT APPLY TO ANY DATABASE.
-- Reviewed against: commit 7ed4b1f, branch my-new-feature (Oct 14 2026).
-- Rollback: sql/proposals/e2ee-stage1-rollback.sql (exact inverse, tested order)
-- Boundary tests: sql/proposals/e2ee-stage1-rls-tests.sql (run AFTER apply,
--   during the approved execution window only)
--
-- DESIGN NOTES
--   * Additive only: no existing table is dropped; the only change to an
--     existing table is two nullable columns on public.messages.
--   * Least privilege: every new table is RLS-on, no grants beyond the
--     minimum columns; vault rows are invisible to all other users; prekey
--     bundles expose PUBLIC key material only.
--   * Campus isolation: not applicable to device/key tables (they are
--     strictly per-user); enforced anyway as a defense-in-depth check on
--     report evidence (evidence must reference a reporter with a profile).
--   * No application reads the vault; the client (future stages) is the
--     only writer of ciphertext blobs and the only reader of its own row.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. user_devices — one row per enrolled browser/device
-- ----------------------------------------------------------------------------
create table if not exists public.user_devices (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  device_name       text not null default 'Unknown device',
  identity_key_pub  text not null,               -- base64 X25519 public key
  signed_prekey_pub text not null,               -- base64 public signed prekey
  spk_signature     text not null,               -- base64 signature by identity key
  created_at        timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  revoked_at        timestamptz,                 -- soft-revoke; clients ignore revoked devices
  unique (user_id, identity_key_pub)
);

comment on table public.user_devices is
  'E2EE device directory. PUBLIC key material only. Private keys never leave the client.';

alter table public.user_devices enable row level security;
alter table public.user_devices force row level security;

create policy user_devices_owner_all on public.user_devices
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- anyone authenticated may read the PUBLIC directory columns of any user
-- (needed to start a conversation), but never modification timestamps of
-- others' devices; split policy keeps the read surface explicit:
create policy user_devices_directory_read on public.user_devices
  for select to authenticated
  using (true);

revoke all on public.user_devices from anon;
grant select (id, user_id, device_name, identity_key_pub, signed_prekey_pub, spk_signature, revoked_at)
  on public.user_devices to authenticated;
grant insert, update, delete on public.user_devices to authenticated; -- RLS restricts to owner rows

-- ----------------------------------------------------------------------------
-- 2. prekey_bundles — one-time prekeys (OPK pool), public keys only
-- ----------------------------------------------------------------------------
create table if not exists public.prekey_bundles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  device_id   uuid not null references public.user_devices(id) on delete cascade,
  opk_id      integer not null,
  opk_pub     text not null,                     -- base64 public one-time prekey
  consumed_at timestamptz,                       -- set when used in X3DH; row stays for audit
  created_at  timestamptz not null default now(),
  unique (device_id, opk_id)
);

comment on table public.prekey_bundles is
  'Public one-time prekey pool. The private halves never leave the client.';

alter table public.prekey_bundles enable row level security;
alter table public.prekey_bundles force row level security;

create policy prekey_owner_all on public.prekey_bundles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy prekey_directory_read on public.prekey_bundles
  for select to authenticated
  using (true);

revoke all on public.prekey_bundles from anon;
grant select (id, user_id, device_id, opk_id, opk_pub) on public.prekey_bundles to authenticated;
grant insert, delete on public.prekey_bundles to authenticated;

-- ----------------------------------------------------------------------------
-- 3. user_key_vaults — PIN-encrypted key backup (ciphertext blobs only)
-- ----------------------------------------------------------------------------
create table if not exists public.user_key_vaults (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  vault_version      integer not null default 1,
  kdf_params         jsonb not null,             -- {"algo":"argon2id","t":3,"m":65536,"p":1,"salt":"b64"}
  vault_ciphertext   text not null,              -- base64 AES-GCM blob (identity keys etc.)
  vault_nonce        text not null,              -- base64 96-bit nonce
  updated_at         timestamptz not null default now()
);

comment on table public.user_key_vaults is
  'Recovery vault. Server stores ONLY an Argon2id-derived-key-encrypted blob;
   the server cannot decrypt it (it never sees the PIN).';

alter table public.user_key_vaults enable row level security;
alter table public.user_key_vaults force row level security;

create policy vault_owner_all on public.user_key_vaults
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.user_key_vaults from anon;
grant select, insert, update, delete on public.user_key_vaults to authenticated;

-- ----------------------------------------------------------------------------
-- 4. report_evidence — decrypted evidence submitted by the reporter (E2EE
--    moderation). Direct client reads are impossible; moderation flows read
--    it through SECURITY DEFINER RPCs that check admin membership and write
--    to the append-only audit log (built in a later stage).
-- ----------------------------------------------------------------------------
create table if not exists public.report_evidence (
  id            uuid primary key default gen_random_uuid(),
  report_id     uuid not null references public.reports(id) on delete cascade,
  reporter_id   uuid not null references public.profiles(id) on delete cascade,
  message_id    uuid references public.messages(id) on delete set null,
  kind          text not null check (kind in ('plaintext','franking','attachment_ref','screenshot_ref')),
  ciphertext    jsonb,                          -- optional re-wrapped evidence for admin review
  plaintext_hash text,                           -- sha-256 of submitted plaintext (dedupe/verify)
  franking_tag   text,                           -- HMAC from the sender (see §6 review)
  binding_tag    text,                           -- server-side binding signature (see §6)
  created_at    timestamptz not null default now()
);

alter table public.report_evidence enable row level security;
alter table public.report_evidence force row level security;

-- reporters can append evidence to their OWN report only
create policy report_evidence_insert_own on public.report_evidence
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and exists (select 1 from public.reports r
                where r.id = report_id and r.reporter_id = (select auth.uid()))
  );

-- no direct client select/update/delete, ever; admin reads happen in a
-- SECURITY DEFINER moderation RPC (added in a later stage) that requires
-- admin membership and writes audit rows.
-- DRILL FINDING (Oct 14, local PG15 drill): granting NOTHING also blocks
-- the reporter's own INSERT, which the boundary tests expect to work.
-- Resolution: grant INSERT only — the RLS with-check above still enforces
-- (reporter_id = auth.uid()) AND (report belongs to the same reporter).
revoke all on public.report_evidence from anon;
revoke select, update, delete, truncate, references, trigger
  on public.report_evidence from authenticated;
grant insert on public.report_evidence to authenticated;

-- ----------------------------------------------------------------------------
-- 5. messages franking columns (only change to an existing table)
-- ----------------------------------------------------------------------------
alter table public.messages
  add column if not exists franking_tag text,
  add column if not exists binding_tag  text;

comment on column public.messages.franking_tag is
  'HMAC-SHA256(franking_key, plaintext) computed on the SENDER device. Empty
   for legacy plaintext rows. See security review in
   docs/e2ee-architecture-options.md before relying on it.';
comment on column public.messages.binding_tag is
  'Server-side binding signature over (franking_tag, sender_id, created_at)
   computed with a server-held secret. See review: what it does NOT provide.';

-- Optional server binding trigger. TWO implementation options exist; this
-- proposal ships the DB-trigger form with the secret kept in Supabase vault
-- (pgsodium/vault extension) so it is not readable through PostgREST:
--   (a) DB trigger with vault-stored secret  [proposed here, sketch]
--   (b) Edge function computing the binding on insert
-- SKETCH — deliberately not finalized; see options doc §4.
-- create or replace function public.set_message_binding_tag()
-- returns trigger language plpgsql security definer as $$
-- begin
--   if new.franking_tag is not null and new.binding_tag is null then
--     new.binding_tag := encode(hmac(new.franking_tag ||
--          new.sender_id::text || new.created_at::text,
--          vault.decrypt_by_id('<vault-uuid>'), 'sha256'), 'hex');
--   end if;
--   return new;
-- end $$;

-- ----------------------------------------------------------------------------
-- 6. Rate limiting (reuse the existing fixed-window machinery)
-- ----------------------------------------------------------------------------
-- The existing admin.consume_write_rate_limit() trigger covers messages
-- (60/hr). Extend config for the new tables when the client lands:
insert into admin.write_rate_limits(action, max_count, window_seconds)
values ('prekey_upload', 100, 3600), ('vault_write', 10, 3600)
on conflict (action) do nothing;

-- triggers follow the same pattern as phase5d:
-- create trigger prekey_bundles_rate_limit before insert on public.prekey_bundles
--   for each row execute function admin.consume_write_rate_limit();
-- create trigger user_key_vaults_rate_limit before insert on public.user_key_vaults
--   for each row execute function admin.consume_write_rate_limit();
