-- ============================================================================
-- UniVerse ICOS — Waitlist privacy fix (PROPOSAL v1)
-- ============================================================================
-- STATUS: PROPOSAL — NOT APPLIED. Requires separate owner approval BEFORE
-- production execution. Prepared Oct 14 2026 against commit 7ed4b1f.
-- Target: public.waitlist (77 rows incl. emails, real user data — DO NOT
-- modify rows; this change touches policies/grants only).
--
-- FINDINGS (verified live, read-only):
--   F1. Policy "anon_select" (SELECT, role anon, qual 'true') lets ANY
--       unauthenticated caller read every waitlist row (email, full_name,
--       university). Confirmed: 77 non-null emails readable as anon.
--   F2. Table privileges: anon AND authenticated hold UPDATE, DELETE,
--       TRUNCATE, REFERENCES, TRIGGER (row-level UPDATE/DELETE are denied
--       by RLS since no such policies exist, but TRUNCATE BYPASSES RLS —
--       any anon caller or any logged-in student could drop all rows).
--   F3. No application reads the table: repo code only links to the
--       waitlist site; the waitlist app performs anon INSERT only;
--       administration uses service_role/postgres (dashboard/SQL), which
--       this change does not touch.
--
-- SMALLEST-SAFE-CHANGE DECISION:
--   * DROP the anon_select policy (removes unauthenticated reads).
--   * REVOKE all anon privileges except INSERT (closes the TRUNCATE hole).
--   * REVOKE all authenticated privileges on the table (students have no
--     legitimate waitlist access; they currently rely on deny-by-RLS which
--     does not cover TRUNCATE).
--   * PRESERVE: anon INSERT policy + anon INSERT privilege (waitlist app
--     keeps working), service_role/postgres full access (administration).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PREFLIGHT (run read-only BEFORE applying; abort if any assertion fails)
-- ----------------------------------------------------------------------------
-- P1. Confirm we are on the intended project (check project ref in dashboard
--     or: select current_setting('postgres.version') returns host version;
--     run against loppfyncbehifnspupwa ONLY after owner approval).
-- P2. Expected current state (all three must return exactly these):
select policyname, cmd, coalesce(qual::text,'-') as qual
from pg_policies where schemaname='public' and tablename='waitlist';
-- expect: anon_insert (INSERT, with_check 'true') AND anon_select (SELECT, qual 'true')
select relrowsecurity from pg_class c join pg_namespace n on c.relnamespace=n.oid
where n.nspname='public' and c.relname='waitlist';              -- expect: true
-- P3. Baseline integrity snapshot (must equal the post-migration count):
select count(*) as row_count_before from public.waitlist;       -- expect: 77 (record actual)
-- P4. Confirm no client dependency on anon read (repo audit done Oct 14:
--     grep -rn waitlist src/ → only launch-gate links to external site).
-- P5. Announce: waitlist site must be checked after applying (a manual
--     "join the waitlist" submit on waitlist.universeicos.app).

-- ----------------------------------------------------------------------------
-- MIGRATION (the actual change)
-- ----------------------------------------------------------------------------
begin;

-- 1) remove unauthenticated reads
drop policy if exists anon_select on public.waitlist;

-- 2) anon keeps INSERT ONLY (waitlist signup form)
revoke select, update, delete, truncate, references, trigger
  on public.waitlist from anon;

-- 3) students need nothing on this table; close the RLS-bypass (TRUNCATE)
revoke all on public.waitlist from authenticated;

-- safety: RLS stays enabled (it already is; this is a no-op restatement).
-- NOTE: FORCE ROW LEVEL SECURITY was considered and REJECTED on review
-- (Oct 14): hosted Supabase's `postgres` role is not superuser and has no
-- BYPASSRLS, so FORCE would block dashboard/SQL-editor administration
-- (reads/writes would hit RLS with no postgres-role policy). service_role
-- bypasses RLS by its BYPASSRLS attribute and is unaffected either way.
alter table public.waitlist enable row level security;

commit;

-- ----------------------------------------------------------------------------
-- VERIFICATION (read-only, run AFTER applying)
-- ----------------------------------------------------------------------------
-- V1. anon can no longer read (expect: 42501 permission denied):
--    curl -s "https://loppfyncbehifnspupwa.supabase.co/rest/v1/waitlist?select=id" \
--      -H "apikey: <anon-key>" | head -c 200
-- V2. anon can still INSERT (expect: 201 created; then delete the probe row
--    via service_role):
--    curl -s -X POST ".../rest/v1/waitlist" -H "apikey: <anon-key>" \
--      -H "Content-Type: application/json" \
--      -d '{"email":"wl-fix-probe@universeicos.app","university":"probe","full_name":"Fix Probe","agreed_to_terms":true,"source":"fix-verification"}'
-- V3. authenticated (student JWT) fully blocked (expect: 42501 on any verb).
-- V4. service_role unaffected (expect: 200 list) — administration intact.
-- V5. Row count unchanged:
select count(*) as row_count_after from public.waitlist;       -- == row_count_before (minus the V2 probe if not yet removed)
-- V6. Policies inventory (expect: only anon_insert):
select policyname, cmd from pg_policies
where schemaname='public' and tablename='waitlist';

-- ----------------------------------------------------------------------------
-- ROLLBACK (exact inverse; run only if the waitlist site breaks)
-- ----------------------------------------------------------------------------
-- begin;
-- create policy anon_select on public.waitlist
--   for select to anon using (true);
-- grant select, update, delete, truncate, references, trigger
--   on public.waitlist to anon;
-- grant select, insert, update, delete, truncate, references, trigger
--   on public.waitlist to authenticated;
-- commit;
-- NOTE: rollback deliberately restores the ORIGINAL grants verbatim so the
-- pre-fix state is exactly reproduced; the privacy exposure returns with it.
