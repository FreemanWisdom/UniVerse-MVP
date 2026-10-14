# Stage 1 Drill Report (Oct 14 2026)

## Staging identity check — BLOCKED, substituted locally

- Cloud staging: **none exists.** `GET /v1/projects` shows exactly one project: `loppfyncbehifnspupwa` ("UniVerse ICOS") = PRODUCTION. Per the stop rule, nothing was run against it.
- Substitute: isolated local PostgreSQL 15 (sandbox, throwaway cluster, mocked Supabase environment: `anon`/`authenticated`/`service_role` roles, `auth.uid()` reading `request.jwt.claims`, minimal mock base tables). Zero production credentials used.

## Apply drill

- `sql/proposals/e2ee-stage1-foundation.sql` (amended v1) applied to a fresh mock DB: **0 errors.**
- Amendment made from a real drill finding: the original zero-grant on `report_evidence` also blocked the reporter's own INSERT (T5 fail). Fixed: `grant insert on report_evidence to authenticated` (RLS with-check still enforces own-report + own-reporter). Files updated: `e2ee-stage1-foundation.sql`, `e2ee-stage1-rls-tests.sql`.

## Boundary test results (T1–T6)

| ID | Expectation | Result |
|---|---|---|
| T1 | Directory read OK (granted public columns) | PASS |
| T1b | Ungranted column (`created_at`) read denied | PASS (permission denied) |
| T2 | Cross-owner device INSERT blocked | PASS (RLS violation) |
| T2b | Cross-owner UPDATE/DELETE no-ops | PASS (0 rows / 0 rows) |
| T3 | Prekey public read OK; cross-owner DELETE blocked | PASS |
| T4 | Vault invisible cross-user; anon denied | PASS (0 rows / permission denied) |
| T5 | Own-report evidence INSERT ok; other's report denied; any SELECT denied | PASS after amendment (INSERT 0 1 / RLS violation / permission denied) |
| T6 | Franking columns exist, null on legacy rows | PASS |

## Rollback drill

- `sql/proposals/e2ee-stage1-rollback.sql`: **0 errors.**
- Catalog comparison (tables, messages columns, policies, anon/authenticated grants) after rollback vs a freshly built mock baseline: **identical.** New tables gone, `messages.franking_tag`/`binding_tag` gone, no policy or grant residue.

## Caveats (why this is not the final gate)

- PG15 mock vs production PG17; `auth.uid()` is a mock; PostgREST/HTTP layer not exercised (column-grant denials verified at SQL level only); rate-limit trigger sketch not drilled (commented out by design).
- **Required before production:** a real staging Supabase project drill + the PostgREST verification queries (V1–V6 in the waitlist file pattern). Owner must create/approve a staging project first.

## Residual state

Local cluster is disposable (sandbox VM); no cloud state changed. Proposal files remain PROPOSALS; nothing applied to any Supabase database.
