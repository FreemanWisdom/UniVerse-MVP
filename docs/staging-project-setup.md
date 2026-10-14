# Supabase Staging Environment — Setup Guide (PROPOSAL, not yet executed)

Prepared Oct 14 2026. No staging project exists yet: the account holds a single
project (`loppfyncbehifnspupwa`, "UniVerse ICOS") which is PRODUCTION. This
document is the configuration plan for the isolated staging project required
before any Stage 1 E2EE or patch migration touches production.

## Condensed checklist (reviewed Oct 14 2026)
1. Create project `universe-icos-staging`, region eu-west-1, own DB password in a secret store. **Owner approval required (cost).**
2. Schema-only bootstrap: `pg_dump --schema-only` (public + admin schemas), apply to staging. **Never data, never auth.users, never waitlist emails.**
3. Seed ONLY synthetic `cc-reg-*` fixtures (see docs/regression-matrix.md); confirm `select count(*) from auth.users` contains fixtures only.
4. Env separation: separate anon/service keys; staging keys absent from production env files and vice versa; no shared webhooks or edge-function secrets.
5. Auth: staging site URL + redirect allow-list = staging origins only; email delivery in test mode (never real domains).
6. Pre-apply guards: staging project ref differs from `loppfyncbehifnspupwa`; no production credentials reachable from staging code paths.
7. Rehearse each patch: apply -> verification queries -> rollback -> catalog snapshot diff (technique in this session's patch drill).
8. Production apply only after a clean staging rehearsal, scheduled by the owner.

## Why staging is required
- Patches B/C/D and the E2EE foundation change policies, functions and grants.
  A staging project is the only place to rehearse the apply → verify → rollback
  cycle against real Supabase semantics (PostgREST role resolution, GoTrue,
  RLS evaluation, PG17) before production.
- The local Postgres mock drill (see `docs/stage1-drill-report.md` and this
  session's patch validation) validates SQL logic but cannot validate
  Supabase-specific behavior (PostgREST grants resolution, JWT claims from
  GoTrue, the SQL editor role).

## Steps (owner actions marked)

1. **Create the project** *(owner approval required — it is a paid resource)*
   - Option A (dashboard): supabase.com/dashboard → New project → name
     `universe-icos-staging`, region `eu-west-1` (same as production so
     behavior matches), Postgres 17, strong generated DB password saved to a
     secret manager, NOT in the repo.
   - Option B (API): `POST https://api.supabase.com/v1/projects` with
     `{ "name": "universe-icos-staging", "region": "eu-west-1", ... }` —
     costs apply, so owner approval first.
   - Record the new project ref (the `xxxxxxxxxxxxxxxxxxxx` subdomain).

2. **Schema bootstrap — do NOT copy production data**
   - Dump production SCHEMA only:
     `pg_dump "$PROD_DB_URL" --schema=public --schema=admin --schema=storage --schema-only > schema.sql`
     (`--schema-only`; never `--data`; never auth.users).
   - Apply to staging: `psql "$STAGE_DB_URL" -f schema.sql`.
   - Then restore *function bodies* (the management API `database/query`
     endpoint with `pg_get_functiondef` captures, or the same pg_dump schema
     file already includes them).
   - Seed deterministic fixtures ONLY (the `cc-reg-*` pattern from
     `docs/regression-matrix.md`), never real student rows, never waitlist
     emails, never push_subscription rows.

3. **Auth configuration**
   - Site URL: `https://universe-icos-staging.vercel.app` (or a dedicated
     staging deployment); redirect allow-list: staging origins only.
   - Create fixture users through the real signup API (or admin API) —
     `auth.users` is NOT copied from production.
   - Disable external email delivery in staging where possible (Resend test
     mode or a dedicated Resend key scoped to test sends) so staging does not
     email real domains.

4. **Key/credential hygiene**
   - Separate anon/service keys per project (they are, by construction).
   - Never put production service keys in staging env files.
   - `.env.example`-style documentation only; real values live in Vercel env /
     secret storage.
   - Production credentials are never used against staging and vice versa.

5. **Apply → verify → rollback rehearsal** (per patch)
   - Run the patch SQL on staging, run the patch's verification queries, run
     `sql/proposals/*-rollback.sql`, confirm the catalog is restored
     (the local drill's snapshot-diff technique).
   - Only after a clean staging rehearsal does a patch get scheduled for
     production, with a maintenance-window decision by the owner.

## Isolation checklist (must all be true before apply)
- [ ] Staging project ref ≠ `loppfyncbehifnspupwa`.
- [ ] Staging DB contains zero real user rows (verified:
      `select count(*) from auth.users` = fixtures only).
- [ ] Staging keys absent from production env and vice versa.
- [ ] No shared webhooks/edge-function secrets between projects.

## Open items for the owner
- Approve project creation (cost).
- Decide branch strategy: staging deploys from `my-new-feature` CI or
  manual `vercel` CLI previews; production stays on the main-merge flow.
