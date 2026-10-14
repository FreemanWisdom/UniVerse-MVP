# Production Patch Release Package — B, C, D (APPROVAL REQUEST)

Prepared Oct 14 2026 · repo `my-new-feature` @ 7ed4b1f · all files uncommitted
under `sql/proposals/`. Nothing in this package has been executed against any
database. Every migration and rollback was validated on the local Postgres
catalog mock (bugs reproduced → fixes verified → rollback restored verbatim).

## Contents
| Patch | Migration file | Rollback file | Fixes |
|---|---|---|---|
| B | sql/proposals/patch-b-g8-block-enforcement.sql (100 ln) | patch-b-g8-block-enforcement.rollback.sql | G8: blocking decorative; blocked users can DM |
| C | sql/proposals/patch-c-g9-g7-rpc-contracts.sql (118 ln) | patch-c-g9-g7-rpc-contracts.rollback.sql | G9: orbit reports unresolvable · G7: announcements unpublishable |
| D | sql/proposals/waitlist-anon-read-fix.sql (107 ln) | rollback section (commented, in-file) | anon can read + TRUNCATE the waitlist |

Apply order: **D → C → B** (D is risk-isolated and instantly reversible; C is
a pure function swap; B touches the hot messages INSERT path last), with full
verification between patches. Each patch is independently reversible.

## Confirmation questions (verified against file text + drill evidence)

### Patch B — helper hardening: CONFIRMED
- Fixed `set search_path = 'public', 'pg_catalog'` (no `"$user"`). ✓
- Schema-qualified references: `public.blocks`, `admin.user_allowed`,
  `auth.uid()` (auth schema is a schema qualification, resolved without
  search_path). ✓
- Least privilege: `revoke all ... from public; revoke all ... from anon;
  grant execute ... to authenticated`. ✓
- Caller-scoping: raises `invalid_block_query` unless `auth.uid()` is one of
  the two arguments — cannot serve as an oracle for other users' blocks
  (drill B-FIX6). Anon denied (B-FIX7). ✓
- Definer-bypass assumption: the helper reads `public.blocks` as its DEFINER
  (postgres = table owner, exempt from RLS as owner). This exact mechanism is
  already proven in production by `admin_moderate_report` reading
  `public.reports` under SECURITY DEFINER. ✓
- Drill: 8/8 checks (blocked/blocker denied both directions, control pair OK,
  reads untouched, unblock restores sending).

### Patch C — legacy compatibility + admin auth: CONFIRMED
- Normalization is a strict superset: `'post'→'orbit_post'`,
  `'comment'→'orbit_comment'`, else-unchanged; stored legacy rows
  (`'orbit_post'`, `'orbit_comment'`, `'whisper'`) resolve exactly as before
  (drill C-FIX2/C-FIX3). ✓
- `admin.is_admin()` gate is the first statement of both functions, unchanged;
  non-admin → `admin_access_required` (drill C-NEG1/C-NEG3); invalid action →
  `invalid_moderation_action` (C-NEG2). ✓
- G7 audit call now matches the proven `admin_moderate_report` pattern:
  `'success'` as p_result, jsonb as p_metadata (drill: announcement published,
  audit row `publish_announcement | success | {"scope": ...}`). ✓
- Rollback restores both original bodies verbatim (byte-compared in drill).

### Patch D — waitlist: CONFIRMED
- Preserves anon INSERT: only the `anon_insert` policy and the INSERT
  privilege remain for anon (drill D-FIX2 INSERT 0 1). ✓
- Preserves administration: service_role (BYPASSRLS) and the table owner are
  untouched; FORCE RLS deliberately rejected (it would break dashboard/SQL
  editor admin). ✓
- Denies anon SELECT and TRUNCATE: `drop policy anon_select` + privilege
  revoke (drill D-FIX1/D-FIX3 permission denied). Authenticated fully
  revoked (D-FIX4/D-FIX5). ✓
- Row data never modified; count snapshot in preflight P3 guards integrity.

## Preflight (read-only, before ANY apply — abort on mismatch)
Common: confirm project ref is `loppfyncbehifnspupwa` (owner-approved window);
take a catalog snapshot (`pg_policies` for messages/waitlist,
`pg_get_functiondef` for the 2 RPCs, `information_schema.table_privileges`
for waitlist) as the rollback diff baseline.
- B: P-1 messages INSERT policy exists exactly once; P-2 helper absent; P-3
  blocks RLS enabled.
- C: P-1 both RPCs exist in public; P-2 the 4-arg audit call still present
  (i.e., the bug is still there — confirms rollback baseline); P-3
  `admin.write_audit` signature is (action, target_type, target_id, result,
  metadata).
- D: P-2 expect policies {anon_insert, anon_select}; RLS enabled; P-3 record
  row count (77).

## Post-apply verification + API-level checks
Production verification uses documented `cc-reg-*` throwaway accounts
(created via the real signup API, fully deleted after) — same pattern as the
regression sweeps; real users untouched.

**After D** (waitlist):
1. `GET /rest/v1/waitlist?select=id` with anon key → **403/42501 denied**.
2. `POST /rest/v1/waitlist` with anon key → **201 Created** (probe row deleted
   via service key immediately).
3. Any verb with a student JWT → **denied**.
4. service key `GET` → **200** (dashboard export path intact).
5. Manual: submit the waitlist form on waitlist.universeicos.app.
6. `pg_policies` shows only `anon_insert`; row count unchanged.

**After C** (RPCs):
1. As admin: `POST /rest/v1/rpc/orbit_create_report` (content_type 'post') on
   a fixture post → report row created.
2. `POST /rest/v1/rpc/admin_moderate_report {p_report_id, p_action:'remove'}`
   → **{"ok":true}**; orbit post hidden from fixture feed; report resolved;
   audit row written (service key read of audit_log).
3. Legacy check: `admin_moderate_report` on an old `content_type='orbit_post'`
   row → ok (any pre-existing pending one, or skip if none).
4. `POST /rest/v1/rpc/admin_publish_announcement` → **ok:true**; row in
   admin.announcements; audit metadata carries scope (delete the probe
   announcement after).
5. As student JWT: both RPCs → `admin_access_required` (PostgREST error).
6. Realtime feeds unaffected (orbit/chat subscribe smoke).

**After B** (blocks):
1. Fixture pair: A blocks B via the chat UI (or REST blocks insert).
2. B `POST /rest/v1/messages` → **42501 new row violates RLS policy**.
3. A `POST /rest/v1/messages` → also denied (original semantics: blocker
   cannot send either).
4. Control pair C→D: message sends (201), arrives via realtime.
5. `POST /rest/v1/rpc/blocks_pair_blocked` for two unrelated uuids →
   `invalid_block_query`; with anon key → permission denied.
6. Unblock → A can send again.
7. Cleanup: delete fixture conversations/messages/blocks + accounts.

## Rollback commands (per patch, exact inverse, drill-proven)
- B: `psql -f sql/proposals/patch-b-g8-block-enforcement.rollback.sql`
  (restores original policy verbatim + drops helper; re-introduces G8).
- C: `psql -f sql/proposals/patch-c-g9-g7-rpc-contracts.rollback.sql`
  (restores both original bodies; re-introduces G9+G7).
- D: uncomment and run the ROLLBACK block inside
  `sql/proposals/waitlist-anon-read-fix.sql` (recreates anon_select + restores
  original grants; re-introduces the exposure).
Post-rollback: diff the preflight catalog snapshot — must match byte-for-byte.

## POST-APPLY RECORD (Oct 14 2026 — patches D, C, B applied to production)
All three patches applied in order D → C → B and verified live (REST + simulated
JWTs); cc-reg-pc fixtures fully cleaned (profiles back to 55, waitlist 77).
Discovery during C verification: the ORIGINAL admin_moderate_report orbit branch
also violated orbit_feed_status_check (status='removed' not allowed) — the
branch was doubly broken. Patch C was amended before final apply to set
moderation_status='removed' (matches admin_moderate_content + feed filter on
moderation_status='active'). Patch B applied inside a transaction (no deny
window). Patch D verified: anon GET/DELETE 42501, INSERT 201, authenticated
denied, 77 rows intact. Patch C verified: 'post' report removed+resolved+audited,
non-admin admin_access_required, announcement published with success audit.
Patch B verified: blocked/blocker sends denied, foreign-pair probe invalid,
anon helper denied, unblock restores sending; helper EXECUTE = authenticated only.
2 permanent audit rows from the synthetic fixture remain (as flagged in advance).

## Unresolved risks / recommended pre-apply edit
1. **Patch B is not wrapped in a transaction.** Between `drop policy` and
   `create policy`, RLS deny-by-default blocks ALL message inserts for ~1
   statement. Recommend wrapping Steps 1–3 in `begin; ... commit;` before
   applying (single-statement atomic swap). Same for its rollback.
2. Patch C verification on production writes audit rows (append-only,
   permanent) and one probe announcement — both are trace artifacts, probe
   announcement deleted.
3. PostgREST/schema-cache: after apply, function/policy changes are picked up
   immediately; no `NOTIFY pgrst, 'reload schema'` expected to be needed, but
   include it as a fallback check in the runbook.
4. Rollbacks re-introduce the original bugs — they are for break-glass only.
5. Local mock was Postgres 15; production is 17 — no version-specific syntax
   used (verified plain DDL), but staging rehearsal remains recommended.

## Approval requested (exact scope)
1. Approve production apply of D, C, B (in that order) with the verification
   above, using cc-reg-* throwaways, during an owner-chosen window.
2. Approve (or fold in) the transaction-wrap edit to Patch B first.
3. Separately: staging project creation per docs/staging-project-setup.md.

## Design-doc conformance (ambassador + announcements vs the 4 decisions)
- **Restricted role grants** — met: campus_ambassador reuses admin.roles +
  admin.members; grants only via existing audited admin_grant_role;
  ambassador self-grant impossible (server-side is-checks). ✓
- **Auditable report escalation** — met: ambassador_escalate_report writes
  admin.write_audit; metadata-only report context; idempotent; no
  resolution/ban/remove powers. ✓
- **Validated announcement attribution** — met: attribution_mode/display_name
  validated in the publish RPC; published_by retained internally and excluded
  from the student read RPC. ✓
- **Backend-enforced announcement visibility** — met: SECURITY DEFINER
  get_active_announcements computes scope server-side from the caller's
  university; no client grants on admin.announcements (re-verified this
  session). ✓
Both designs remain PROPOSAL-only pending the above patch approval and are
not part of this release package.
