-- ============================================================================
-- UniVerse ICOS — E2EE Stage 1 ROLLBACK (PROPOSAL v1)
-- ============================================================================
-- STATUS: PROPOSAL — exact inverse of sql/proposals/e2ee-stage1-foundation.sql
-- Run order: as written. All operations are IF EXISTS-guarded so this is safe
-- to run even if only part of the forward script was applied.
-- PRECONDITION: confirm no client build referencing the new tables is live.
-- ============================================================================

-- 6. rate limiting config added by stage 1
delete from admin.write_rate_limits
where action in ('prekey_upload', 'vault_write');

-- (drop triggers if the sketch was finalized)
drop trigger if exists prekey_bundles_rate_limit on public.prekey_bundles;
drop trigger if exists user_key_vaults_rate_limit on public.user_key_vaults;
drop function if exists public.set_message_binding_tag();

-- 5. messages columns (drops are metadata-only; existing rows keep their data
--    in the remaining columns; the two new columns hold no user content
--    until E2EE client code ships — verify column usage is empty first)
alter table public.messages
  drop column if exists binding_tag,
  drop column if exists franking_tag;

-- 4. report_evidence (rows can only exist after a later stage; drop is safe
--    at stage-1 review time because nothing writes it yet)
drop table if exists public.report_evidence;

-- 3. vaults
drop table if exists public.user_key_vaults;

-- 2. prekey bundles
drop table if exists public.prekey_bundles;

-- 1. devices
drop table if exists public.user_devices;

-- NOTE: dropping the tables removes their policies, grants, and comments
-- implicitly. No other object created by the forward script survives.
-- messages remains exactly as it was pre-proposal.
