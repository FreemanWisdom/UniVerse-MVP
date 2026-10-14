-- ============================================================================
-- UniVerse ICOS — E2EE Stage 1 boundary tests (PROPOSAL v1)
-- ============================================================================
-- STATUS: PROPOSAL — run ONLY after the forward script is approved and
-- applied, during the execution window. Every query is read-only except
-- the fixture writes marked [W], which are rolled back in the same
-- transaction. Method: set_config('role','authenticated') + synthetic
-- request.jwt.claims, mirroring docs/regression-matrix.md §3.
-- Expected outcomes assert least-privilege, ownership checks, and that no
-- unauthorized read/write is possible.
-- ============================================================================

-- T1 user_devices: user A cannot read B's full row surface (directory policy
--    exposes only the granted public columns; attempting a private column
--    must fail, proving column grants hold):
-- expect: ERROR 42501 on last_private_col
begin;
select set_config('role','authenticated', true),
       set_config('request.jwt.claims', '{"sub":"<uuid-a>","aud":"authenticated"}', true);
select id, user_id, identity_key_pub from public.user_devices limit 1;      -- OK
select created_at from public.user_devices limit 1;                        -- DENY (not granted)
rollback;

-- T2 user_devices: user A cannot insert/update/delete B's device rows
-- [W] expect: 0 rows affected / RLS violation
begin;
select set_config('role','authenticated', true),
       set_config('request.jwt.claims', '{"sub":"<uuid-a>","aud":"authenticated"}', true);
insert into public.user_devices (user_id, identity_key_pub, signed_prekey_pub, spk_signature)
values ('<uuid-b>', 'x', 'y', 'z');                                         -- DENY (with check)
update public.user_devices set device_name = 'hijacked'
  where user_id = '<uuid-b>';                                              -- 0 rows
delete from public.user_devices where user_id = '<uuid-b>';                -- 0 rows
rollback;

-- T3 prekey_bundles: directory read works, cross-user delete blocked
-- expect: select OK (granted cols); delete 0 rows / deny
begin;
select set_config('role','authenticated', true),
       set_config('request.jwt.claims', '{"sub":"<uuid-a>","aud":"authenticated"}', true);
select opk_id, opk_pub from public.prekey_bundles where user_id = '<uuid-b>';  -- OK
delete from public.prekey_bundles where user_id = '<uuid-b>';               -- DENY
rollback;

-- T4 user_key_vaults: B's vault invisible to A; anon gets nothing
-- expect: 0 rows for A; permission denied for anon
begin;
select set_config('role','authenticated', true),
       set_config('request.jwt.claims', '{"sub":"<uuid-a>","aud":"authenticated"}', true);
select * from public.user_key_vaults where user_id = '<uuid-b>';            -- 0 rows
rollback;
begin;
select set_config('role','anon', true);
select count(*) from public.user_key_vaults;                               -- DENY
rollback;

-- T5 report_evidence: reporter can attach evidence to own report only;
--    nobody (client) can select it
-- expect: [W] insert own OK (INSERT granted, RLS-scoped); insert into
--          someone else's report DENY (RLS with-check); select DENY (no grant)
begin;
select set_config('role','authenticated', true),
       set_config('request.jwt.claims', '{"sub":"<uuid-a>","aud":"authenticated"}', true);
insert into public.report_evidence (report_id, reporter_id, kind, plaintext_hash, franking_tag)
values ('<own-report-uuid>', '<uuid-a>', 'plaintext', 'h', 'f');           -- OK
insert into public.report_evidence (report_id, reporter_id, kind, plaintext_hash, franking_tag)
values ('<other-report-uuid>', '<uuid-b>', 'plaintext', 'h', 'f');         -- DENY
rollback;
begin;
select set_config('role','authenticated', true),
       set_config('request.jwt.claims', '{"sub":"<uuid-a>","aud":"authenticated"}', true);
select count(*) from public.report_evidence;                               -- DENY
rollback;

-- T6 messages franking columns: backfill-safe, invisible to legacy client
--    selects (client uses select "*" today — after E2EE lands the client
--    MUST move to an explicit column list; this test only asserts the
--    columns exist and are null for existing rows):
-- expect: count = 0 with the live client build unchanged
begin;
select set_config('role','authenticated', true),
       set_config('request.jwt.claims', '{"sub":"<uuid-a>","aud":"authenticated"}', true);
select count(*) from public.messages where franking_tag is not null;       -- 0
rollback;

-- T7 rate limits (after triggers are finalized): prekey upload window
-- expect: 101st insert in the hour raises rate_limit_exceeded (admin exempt)
