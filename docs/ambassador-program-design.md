# Campus Ambassador Feature — Design Proposal

**Status: IMPLEMENTED Oct 14 2026** (owner directive): `sql/ambassador-program.sql` applied to production (rollback alongside) + client shipped. Open decisions resolved at implementation: (1) escalation storage = status + audit log, NO new columns (reviewed_by/reviewed_at untouched); (2) who grants = unchanged admin_grant_role path, super_admin-only (school_admin self-service deferred); (3) added an admin-compatibility guard — granting campus_ambassador to an active admin is refused (admin.members is one row per user; without the guard the upsert would silently strip an admin role). Verified by matrix rows AM-1..AM-20 (docs/regression-matrix.md §4.9). Original proposal below.

## Current facts (verified)

- Roles live in `admin.roles`: moderator, platform_admin, school_admin,
  super_admin. Membership in `admin.members (user_id, role_id, school_id,
  is_active, created_at, updated_at)` — school scoping is already modeled.
- Grant/revoke already exist and are audited: `admin_grant_role` and
  `admin_set_campus_admin` (frontend: `src/services/admin/admin.service.ts`
  lines 203–223, used by `src/app/admin/admins/page.tsx` and Users manage
  panel).
- Admin gate pattern: `admin_bootstrap()` returns {authorized, role} via
  inline `admin.is_admin()` check; verified gated in the G10 re-probe.
- `public.reports (id, reporter_id, content_type, content_id, reason,
  status, created_at, reviewed_by, reviewed_at)`.
- `admin.write_audit(actor, action, target_type, target_id, metadata)` is the
  audited write primitive (append-only trigger on `admin.audit_log`).
- Student app route groups: `src/app/(student)/{chat,notifications,orbit,
  profile,settings,study,u,verify,whisper}`.

## Smallest-change design

### 1. Campus-scoped ambassador role (SQL proposal, NOT executed)
- `INSERT INTO admin.roles (name) VALUES ('campus_ambassador');` — one row in
  the EXISTING roles table. No new membership table; reuse `admin.members`
  with `school_id NOT NULL` for this role.
- Grant/revoke: reuse `admin_grant_role` / revoke path unchanged (already
  gated to super_admin/platform_admin and audited). Enforce school_id present
  when role = campus_ambassador (a CHECK added inside the grant function or a
  trigger guard — decide at implementation).
- Rollback: `DELETE FROM admin.roles WHERE name='campus_ambassador';` after
  removing member rows.

### 2. Ambassador gate RPC (new, mirrors admin_bootstrap)
`public.ambassador_get_scope()` → SECURITY DEFINER:
- Returns the caller's campus (`schools.name` via profile.university) IF the
  caller holds an active campus_ambassador membership for that school;
  returns null otherwise. No table grants; revoke EXECUTE from anon.
- Frontend uses this both to show/hide the Settings entry and as the auth
  boundary before rendering the dashboard.

### 3. Campus statistics (new RPC, no new tables)
`public.ambassador_get_campus_stats()` → SECURITY DEFINER, scoped by
`ambassador_get_scope()`; returns aggregate counts only (students on campus,
pending reports touching campus content, orbit posts 24h/7d). Derived from
existing tables; no PII beyond counts.

### 4. Reported-content context (new RPC)
`public.ambassador_list_reports()` → SECURITY DEFINER:
- Returns report metadata ONLY (content_type, reason, status, created_at)
  for reports whose content belongs to the ambassador's campus.
- NEVER returns message bodies, whisper text, or author identities. For
  content_type in ('post','comment','whisper') it resolves the content row's
  campus server-side and filters; for other types returns counts only.

### 5. Escalation (new RPC)
`public.ambassador_escalate_report(report_id, note)` → SECURITY DEFINER:
- Verifies ambassador scope covers the report's content campus.
- Sets `reports.status='escalated'`, appends `escalated_by`/`escalated_at`
  (proposed columns) or stores escalation in `reviewed_by/reviewed_at` +
  status only (decision at review; column add is a schema change needing
  approval).
- Writes an audit row via `admin.write_audit`.
- Idempotent on already-escalated reports; refuses resolved/removed reports.

### 6. Hard negative boundaries (existing, verified — keep untouched)
- No ban: `admin_update_user` stays admin-gated (G10 pattern).
- No content removal: `admin_moderate_report` gate verified (REG-ADM-*).
- No role grants: `admin_grant_role` admin-gated.
- No private messages: messages RLS is membership-only; ambassadors are not
  conversation members. No new grants on messages.

## Files that would change (implementation phase, after approval)
- NEW `sql/proposals/ambassador-role.sql` (+ rollback) — role row + 4 RPCs +
  grants/revokes, all audited.
- NEW `src/services/ambassador/ambassador.service.ts` — RPC client wrappers.
- NEW `src/app/(student)/settings/ambassador/page.tsx` — dashboard (stats,
  report context list, escalate button). Light corporate style per admin
  aesthetic preference is NOT required here; match student dark theme.
- EDIT `src/app/(student)/settings/page.tsx` — new section rendered only when
  `ambassador_get_scope()` returns a campus.
- EDIT `src/app/admin/admins/page.tsx` — show campus_ambassador in role
  dropdown (already generic via roles list? verify at implementation).
- EDIT `docs/regression-matrix.md` — ambassador test rows.

## Test cases (to run on staging, never production)
1. Non-ambassador: scope RPC null; direct URL to dashboard shows "not
   available"; escalate/list/stats RPCs → explicit denial.
2. Campus A ambassador: sees own-campus stats/reports; campus B report →
   not listed; escalate campus B report id → denied.
3. Escalate: status changes, audit row written, second escalate on same
   report → idempotent message; resolved report → refused.
4. Revoke role → entry disappears, RPCs deny immediately (no cache).
5. Regression: admin pages unaffected; ambassador calling admin_moderate_report
   / admin_grant_role / admin_update_user → admin_access_required.

## Security considerations
- All authorization server-side (SECURITY DEFINER + inline is-checks); the
  UI gate is cosmetic only.
- Audit every ambassador mutation (escalate); reads are not audited
  (consistent with existing moderation reads).
- Whisper anonymity: report context exposes NO author identity — author_id
  column is not granted to clients (verified in 5C hardening).
- Rate-limit escalation (reuse admin.write_rate_limits pattern) to prevent
  report-spam abuse.

## Dependencies
- Patches B/C/D applied first (report status/announcement RPC hygiene) or
  reviewed together — escalation writes to the same reports table that
  Patch C touches.
- Staging project (docs/staging-project-setup.md) for safe testing.

## Open decisions for owner
- Escalation storage: new columns (schema change) vs status+reviewed_by
  reuse.
- Should school_admin be able to grant campus_ambassador for their campus
  only, or super_admin only (recommended: school_admin allowed for own
  campus, platform audit row regardless)?
