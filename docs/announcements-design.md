# Student-Facing Announcements — Design Proposal (PROPOSAL ONLY)

Status: PROPOSED — no SQL applied, no code written. Awaiting owner review.
Repo state reviewed: `my-new-feature` @ 7ed4b1f.

## Current facts (verified)

- `admin.announcements (id, scope, title, body, published_by, published_at,
  is_active)`. `scope` is free text; the admin UI (src/app/admin/announcements/
  page.tsx) notes targeted delivery and scheduling are NOT implemented.
- Publishing goes through `admin_publish_announcement(scope, title, body)`
  (admin-gated, audited as `publish_announcement`; the audit-call signature
  bug is fixed in Patch C, pending approval).
- Students currently have NO announcements interface: no student route,
  service, or component reads announcements. Verified by repo-wide grep.
- NO client grants on admin.announcements (only postgres) — students cannot
  read it directly today. A backend-enforced read path is required.

## Proposed design (smallest changes)

### 1. Scope semantics (no schema change)
- Formalize `scope` values: `'global'` (all students) and
  `'campus:<exact schools.name>'` (e.g. `campus:University of Nigeria, Nsukka`).
- Enforce in `admin_publish_announcement`: whitelist global + valid campus
  names (rejects typos/unknown campuses server-side).

### 2. Attribution (schema proposal — needs owner approval)
- Proposed columns on `admin.announcements`:
  - `attribution_mode text NOT NULL DEFAULT 'official'`
    (`'official'` | `'pseudonymous'`)
  - `display_name text` (public byline; when mode=official it defaults to
    the publish UI's chosen handle, e.g. "UniVerse Team"; pseudonymous is
    admin-entered, e.g. "Campus Desk").
- `published_by` (uuid) REMAINS the internal creator attribution and is never
  returned by the student read path. Rollback: drop the two columns.

### 3. Student read RPC (new, backend-enforced)
`public.get_active_announcements()` → SECURITY DEFINER:
- Returns `id, title, body, display_name, attribution_mode, published_at`
  (NOT published_by) for active rows where `scope='global'` OR
  `scope='campus:' || caller's university`.
- Grant EXECUTE to authenticated; revoke from anon. No table grants.

### 4. Admin publish changes
- Extend `admin_publish_announcement` signature or add a new overload
  (decision at review) to accept attribution_mode + display_name; validate
  both; keep the existing audit row (Patch C signature) and add the
  attribution values to audit metadata.

## Files that would change (implementation phase, after approval)
- NEW `sql/proposals/announcements-student-read.sql` (+ rollback) — 2
  columns, read RPC, publish validation, grants/revokes.
- EDIT `src/services/admin/admin.service.ts` — publish wrapper gains
  attribution args.
- NEW `src/services/announcements/student.service.ts` (or extend an existing
  student service) — read wrapper.
- NEW `src/app/(student)/announcements/page.tsx` — student announcements
  page (list, pinned/latest first, empty state per campus-aware copy rules
  used in 5B).
- EDIT `src/app/(student)/layout.tsx` (or the nav component it uses) — nav
  entry; gated to verified-eligible students like other student routes
  (launch gate already enforced by (student)/layout.tsx).
- EDIT `src/app/admin/announcements/page.tsx` — scope picker (global vs
  campus dropdown fed by the existing schools source used in 5B signup),
  attribution fields, disabled UI for unimplemented targeting/scheduling
  removed or kept explicit.
- EDIT `docs/regression-matrix.md` — announcement test rows.

## Test cases (staging)
1. Campus A student sees global + campus:A; campus:B row invisible.
2. Anon caller → RPC denied; authenticated non-student (no profile.university)
   → global only.
3. `is_active=false` hidden everywhere.
4. Student response JSON contains NO published_by / no admin uuid.
5. Publish with scope `campus:Bogus U` → rejected; with display_name empty
   when pseudonymous → rejected; audit row includes attribution metadata.
6. Regression: existing admin announcement list page still works with old
   rows (attribution_mode default 'official').

## Security considerations
- Attribution must not leak identity: pseudonymous mode exists precisely so
  the public byline can differ from the creator; published_by stays
  server-side (audit_log retains the true actor — append-only).
- Scope filter is computed server-side from the caller's profile.university;
  never trust a client-passed campus parameter.
- Announcements are read-only for students; no rate-limit surface needed,
  but the publish path keeps admin gating (verified pattern).

## Dependencies
- Patch C (fixes admin_publish_announcement audit signature) — must land
  first or this design absorbs the same fixed body.
- No frontend dependency; page can ship hidden behind the read RPC.
- Launch-gate layout (`src/lib/launch.ts` campus list) unchanged.

## Open decisions for owner
- New overload vs extended signature for publish RPC (client compatibility).
- Should campus announcements ALSO show a dismissible banner on orbit home,
  or page-only (recommended: page-only v1; banner later)?
