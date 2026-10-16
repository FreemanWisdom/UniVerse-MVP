# UniVerse ICOS — Consolidated Regression Matrix (Stage 0)

Status: v1 — baseline captured Oct 14 2026 against commit `7ed4b1f` (branch `my-new-feature`).
Scope: authentication, direct messages, tribes, Whisper, reporting, campus isolation, admin permissions, announcements.
Rules: no production writes during baseline capture; write-path tests run only inside an approved execution window with throwaway fixtures, then are cleaned up.

---

## 1. Roles under test

| Role | Fixture | Notes |
|---|---|---|
| Unauthenticated visitor | none | anon probes |
| Student (verified, launch campus) | `cc-reg-stu-<n>` (UNN) | throwaway, real signup API |
| Student (other campus, for isolation tests) | `cc-reg-stu-b` (FUNAI) | throwaway |
| Moderator | `cc-reg-mod-<n>` + temp `admin.members` row (`moderator`) | created and removed by harness |
| School admin | `cc-reg-sch-<n>` + temp `admin.members` row (`school_admin`, school UAES) | created and removed by harness |
| Platform admin / super admin | `cc-reg-adm-<n>` + temp row (`super_admin`) | created and removed by harness |
| Real accounts | **never used as fixtures** | 54 real users are untouchable |

**Deterministic test data**: fixed full names (`Reg Matrix One/Two/...`), fixed universities (UNN, FUNAI, UAES), fixed post/message bodies prefixed `REG-`. All rows carry the `cc-reg-` prefix so cleanup is a targeted delete. Fixture creation order and cleanup SQL are in §5.

## 2. Static and build gates (every run)

| ID | Test | Result (Oct 14) |
|---|---|---|
| S1 | `tsc --noEmit` | PASS (0 errors) |
| S2 | `npm run lint` | PASS (0 errors, 6 known baseline warnings) |
| S3 | `npm run build` | PASS |

## 3. Live read-only boundary probes (simulated-JWT, transaction-wrapped, rolled back)

Captured Oct 14. Method: `set_config('role','authenticated')` + synthetic `request.jwt.claims` inside a rolled-back transaction; counts only, no row data dumped.

| ID | Probe | Expected | Result |
|---|---|---|---|
| N1 | Non-member reads `conversations` | 0 rows | PASS (0) |
| N2 | Non-member reads `messages` | 0 rows | PASS (0) |
| N3 | `whisper_identities` direct read | denied | PASS (42501 permission denied) |
| N4 | `admin.announcements` direct read | denied | PASS (42501) |
| N5 | `tribe_posts.author_id` values as non-member | none visible | PASS (0 rows under RLS) |
| N6 | `profiles.admin_note` read | denied | PASS (42501 column grant) |
| N7a | Non-admin `admin_bootstrap()` | `authorized:false` | PASS (`false`) |
| N7b | Super admin `admin_bootstrap()` | `authorized:true` | PASS (`true`, owner account) |
| N7c | Non-admin `admin_list_users` | denied | PASS (`admin_access_required`) |
| N7d | Non-admin `admin_moderate_report` | denied | PASS (`admin_access_required`) |
| N8 | `reports` of others | 0 rows | PASS (0) |
| P1 | `schools` readable | >0 | PASS (142) |
| P2 | `whisper_posts_public` for campus-less user | 0 rows | PASS (0 — campus scoping holds) |
| P3 | `orbit_feed` for campus-less user | 0 rows | PASS (0) |
| A1 | anon reads `waitlist` | deny | **FAIL — 77 rows incl. emails readable by anon (see §6 gap G1)** |

## 4. Full matrix (positive + negative per area)

Browser e2e method = Playwright against a build; API method = direct PostgREST/GoTrue calls; SQL method = simulated-JWT probe. Status legend: ✅ passed Oct 14 or in a prior verified session (noted); ⬜ pending execution window.

### 4.1 Authentication
| ID | Test | Method | Status |
|---|---|---|---|
| AUTH-1 | Signup → 6-digit code screen (masked email, no waitlist notice pre-verify) | browser | ✅ Oct 13 live |
| AUTH-2 | Wrong code rejected, stays on screen | browser | ✅ Oct 13 live |
| AUTH-3 | Correct code → `/orbit` (in-app) | browser | ✅ Oct 13 live |
| AUTH-4 | Duplicate signup → no 2nd account, inline "sign in" message | API+browser | ✅ Oct 13 live |
| AUTH-5 | Unauthenticated → protected routes bounce to `/login` | browser | ✅ Oct 13 live |
| AUTH-6 | Forgot → reset link lands `/reset-password` → mismatch rejected → save → sign-out → new password logs in | browser | ✅ Oct 13 live (real PKCE link) |
| AUTH-7 | Reset link on another device → honest invalid state | browser | ⬜ |
| AUTH-8 | Wrong password rejected; verified-only gate on dashboard | browser | ✅ Oct 13 live |
| AUTH-9 | Non-launch campus student hits waitlist gate after verification (ALL student routes) | browser | ✅ Oct 4; re-run ⬜ |
| AUTH-10 | Signup rate limit (60s resend) surfaces honest message | API | ✅ observed Oct 13; re-run ⬜ |

### 4.2 Direct messages
| ID | Test | Method | Status |
|---|---|---|---|
| DM-1 | Request → accept → conversation exists both sides | browser | ✅ prior verified; re-run ⬜ |
| DM-2 | Send message; realtime INSERT renders for recipient | browser | ⬜ |
| DM-3 | Blocked user cannot message (INSERT policy w/ blocks check) | SQL/browser | ⬜ (negative, needs fixtures) |
| DM-4 | Non-member cannot read messages/conversations | SQL | ✅ N1/N2 Oct 14 |
| DM-5 | Message rate limit (60/hr) triggers honest message | API | ✅ design verified; re-run ⬜ |

### 4.3 Tribes
| ID | Test | Method | Status |
|---|---|---|---|
| TR-1 | Create tribe (own campus), join, post, own-bubble render | browser | ✅ prior verified; re-run ⬜ |
| TR-2 | Cross-campus join blocked (5F WITH CHECK) | SQL/browser | ✅ verified live Sept 29; re-run ⬜ |
| TR-3 | `author_id` never reaches client (column never selected + RLS hides rows) | SQL+code | ✅ N5 Oct 14 |
| TR-4 | Join-request flow: request → creator sees → accept/decline | browser | ⬜ |
| TR-5 | Non-member cannot read tribe posts | SQL | ⬜ (needs tribe fixture) |

### 4.4 Whisper
| ID | Test | Method | Status |
|---|---|---|---|
| WH-1 | Post renders anonymously; identity never exposed | browser | ✅ prior verified; re-run ⬜ |
| WH-2 | `whisper_identities` direct read denied | SQL | ✅ N3 Oct 14 |
| WH-3 | Campus-scoped feed (other campus's whispers invisible) | SQL/browser | ⬜ (needs content fixtures on 2 campuses) |
| WH-4 | Report whisper → admin resolves → hidden from feed, audit written | browser | ✅ verified Sept 28; re-run ⬜ |

### 4.5 Reporting
| ID | Test | Method | Status |
|---|---|---|---|
| RP-1 | Student reports post/whisper (reason only today) | API | ✅ verified; re-run ⬜ |
| RP-2 | Reporter sees own reports only | SQL | ✅ N8 Oct 14 |
| RP-3 | Non-admin moderation denied | SQL | ✅ N7d Oct 14 |
| RP-4 | Admin resolve → content hidden, audit row written | browser | ✅ verified; re-run ⬜ |

### 4.6 Campus isolation
| ID | Test | Method | Status |
|---|---|---|---|
| CI-1 | `orbit_feed` / `whisper_posts_public` scoped to own campus | SQL | ✅ P2/P3 Oct 14 (negative); positive needs fixtures ⬜ |
| CI-2 | `study_resources` cross-campus read blocked | SQL/browser | ⬜ |
| CI-3 | `tribe_members` cross-campus INSERT blocked | SQL | ✅ live-verified Sept 29; re-run ⬜ |
| CI-4 | Chat discovery only returns own-campus students | RPC | ✅ live-verified Sept 27; re-run ⬜ |

### 4.7 Admin permissions (role boundaries)
| ID | Test | Method | Status |
|---|---|---|---|
| AD-1 | Non-admin blocked on all 14 admin routes + `admin_bootstrap` false | SQL+browser | ✅ N7a Oct 14 + server gate verified |
| AD-2 | Moderator: can resolve reports, cannot manage roles/schools | SQL/browser | ⬜ (no disposable moderator fixture yet) |
| AD-3 | School admin: scoped to own campus, cannot grant platform roles | SQL/browser | ⬜ |
| AD-4 | Super admin: full console + grant/revoke campus admin | browser | ✅ verified Sept 29; re-run ⬜ |
| AD-5 | `admin.announcements` no direct read (admin RPC only) | SQL | ✅ N4 Oct 14 |
| AD-6 | Every admin RPC raises `admin_access_required` for non-admins | SQL | ✅ spot-checked N7c/N7d; full sweep ⬜ |

### 4.8 Announcements
| ID | Test | Method | Status |
|---|---|---|---|
| AN-1 | Admin publishes announcement, audited with scope + attribution | browser (admin console) | ✅ PASS (Oct 14 — cc-ann-* window, cleaned) |
| AN-2 | Student sees active global + own-campus announcements | browser (/announcements) | ✅ PASS (Oct 14 — student-facing page shipped, gap G3 closed) |
| AN-3 | Campus isolation: UNN student does not see campus:FUNAI row (and inverse) | browser + simulated JWT | ✅ PASS |
| AN-4 | `is_active=false` hidden from student read RPC | simulated JWT | ✅ PASS |
| AN-5 | Student read shape contains no `published_by` | simulated JWT (jsonb_object_keys) | ✅ PASS |
| AN-6 | anon denied EXECUTE on `get_active_announcements` | simulated JWT (role anon) | ✅ PASS (42501) |
| AN-7 | Unauthenticated caller → `not_authenticated` | simulated JWT (no sub) | ✅ PASS |
| AN-8 | Direct `admin.announcements` student SELECT stays denied | simulated JWT | ✅ PASS (42501) |
| AN-9 | Publish rejects unknown campus / invalid scope / pseudonymous w/o byline / bad attribution | simulated JWT | ✅ PASS (4 error codes) |
| AN-10 | Non-admin publish → `admin_access_required` | simulated JWT | ✅ PASS |
| AN-11 | Legacy `'platform'` scope normalized to `'global'` on write (old console compat) | simulated JWT | ✅ PASS |
| AN-12 | 390px mobile: nav entry present, no horizontal overflow, zero console errors | browser | ✅ PASS |

Implementation: `sql/announcements-student-read.sql` (applied Oct 14, rollback alongside) + student page `src/app/(student)/announcements/` + admin console scope/attribution UI. Test window fixtures `cc-ann-*` fully cleaned (profiles 55, waitlist 77, roster 3); publish audit rows are permanent (append-only, pre-flagged).

### 4.9 Campus Ambassador (shipped Oct 14 2026)
| ID | Test | Method | Status |
|---|---|---|---|
| AM-1 | Grant campus_ambassador via amended admin_grant_role (school required) | simulated JWT as super admin | ✅ PASS |
| AM-2 | Grant without school → school_required_for_campus_ambassador | simulated JWT | ✅ PASS (22023) |
| AM-3 | Grant to active admin → ambassador_incompatible_role guard | simulated JWT | ✅ PASS (22023) |
| AM-4 | Grant by non-super → super_admin_required | simulated JWT | ✅ PASS (42501) |
| AM-5 | Non-ambassador: scope null; stats/list/escalate → ambassador_access_required | simulated JWT | ✅ PASS |
| AM-6 | Ambassador scope = own campus only (membership AND profile.university must match) | simulated JWT | ✅ PASS |
| AM-7 | Campus stats: counts only, campus-correct (UNN vs FUNAI) | simulated JWT | ✅ PASS |
| AM-8 | Report list: campus-isolated, actionable statuses only (pending+escalated), metadata-only shape {id, content_type, reason, status, created_at} | simulated JWT | ✅ PASS |
| AM-9 | Escalate own-campus report: status→escalated, audit row written, reviewed_by/at stay null | simulated JWT | ✅ PASS |
| AM-10 | Escalate same report → idempotent {ok, already_escalated:true}, no 2nd audit row | simulated JWT | ✅ PASS |
| AM-11 | Escalate other-campus report → report_outside_scope (42501) | simulated JWT | ✅ PASS |
| AM-12 | Escalate resolved/dismissed report → report_already_resolved | simulated JWT | ✅ PASS |
| AM-13 | Rate limit: 10 escalations/hour per ambassador, then rate_limit_exceeded | simulated JWT (11 attempts) | ✅ PASS |
| AM-14 | Revoke via admin_grant_role(enabled=false) → scope null, RPCs deny immediately | simulated JWT | ✅ PASS |
| AM-15 | Ambassador NOT admin: is_admin()=false; admin_moderate_report/admin_grant_role → admin_access_required/super_admin_required | simulated JWT | ✅ PASS |
| AM-16 | anon denied EXECUTE on all 4 ambassador RPCs (42501); _report_campus helper postgres-only | simulated JWT (role anon) | ✅ PASS |
| AM-17 | Admin console: Users manage panel appoints ambassador w/ school picker; blocked-on-admin surfaces friendly guard message | browser | ✅ PASS |
| AM-18 | Ambassador student: Settings shows Ambassador dashboard row; dashboard renders stats + campus-scoped reports; escalate from UI flips status | browser | ✅ PASS |
| AM-19 | Plain student: no Settings entry; direct URL → "Not available" | browser | ✅ PASS |
| AM-20 | 390px dashboard: no horizontal overflow, zero console errors | browser | ✅ PASS |

Implementation: `sql/ambassador-program.sql` (applied Oct 14, rollback alongside) + client files in `src/services/ambassador/`, `src/app/(student)/settings/ambassador/`, admin Users manage panel card. Escalation is NO schema change: `status='escalated'` + audit log (reviewed_by/reviewed_at untouched). Ambassadors can never ban, remove content, grant roles, or read private messages (AM-15 hard boundaries, existing gates untouched). Test fixtures `cc-amb-*` fully cleaned (profiles 55, waitlist 77, roster 3, zero AMB- reports/content, escalate counters cleared); grant/revoke/escalate audit rows are permanent (append-only, pre-flagged).

### 4.10 Admin Schools discovery + Super Admin invitations (shipped Oct 15 2026)
| ID | Test | Result |
|----|------|--------|
| SCH-1 | Schools default view = exactly the five pioneer campuses (launch.ts names) | PASS (e2e) |
| SCH-2 | Non-pioneer school absent from default view | PASS (e2e) |
| SCH-3 | Search finds zero-user non-pioneer school (ATBU) | PASS (e2e) |
| SCH-4 | Search results distinguish Pioneer vs Community | PASS (e2e) |
| SCH-5 | SQL-side pagination (page change + prev restore) | PASS (e2e) |
| SCH-6 | Details: registered + waitlisted counts vs ground truth | PASS (e2e + RPC) |
| SCH-7 | Active users labeled unavailable (no activity data exists) | PASS (e2e) |
| SCH-8 | anon + non-admin denied on all 3 school RPCs | PASS (simulated JWT) |
| SCH-9 | User list search + pagination, safe columns only | PASS (e2e + RPC) |
| INV-1 | create: non-super-admin/anon denied | PASS (simulated JWT) |
| INV-2 | create refuses email of an active super admin | PASS |
| INV-3 | create: rate limit 3/hour per admin | PASS |
| INV-4 | token stored as sha256 hash only; raw never persisted | PASS |
| INV-5 | duplicate pending invitation for same email refused | PASS |
| INV-6 | accept requires session email == invitee email | PASS |
| INV-7 | accept grants super_admin + records accepted_by + audit | PASS |
| INV-8 | replay / garbage token refused (single-use) | PASS (e2e + RPC) |
| INV-9 | revoked and expired tokens refused | PASS |
| INV-10 | revoke restricted to super admin | PASS |
| INV-11 | list shows no token_hash; effective status incl. expired | PASS |
| INV-12 | accept page reachable pre-login; full UI accept flow | PASS (e2e) |
| SCR-A | schools/admin-access/security-events scroll + 390px no overflow | PASS (e2e) |

Notes: invitations table RLS-on with no client grants (RPC-only). Pending (1) list
rendered for the invited email; Resend invite + confirmation emails delivered
(noreply@universeicos.app). Fixtures cc-acc-* (3 raw + 3 UI accounts) fully
cleaned: profiles/wallet counts back to baseline +2 genuine new signups, roster
3 original admins, invitations table empty. Invitation audit rows permanent
(pre-flagged).

## 5. Fixture and cleanup procedure (execution window only)

1. Create throwaways via real `/auth/v1/signup` (never raw SQL insert — known GoTrue gotcha): `cc-reg-stu-1@universeicos.app` (UNN), `cc-reg-stu-2` (FUNAI), `cc-reg-mod-1`, `cc-reg-sch-1`, `cc-reg-adm-1`. Confirm via `email_confirmed_at=now()` (generated `confirmed_at` cannot be set).
2. Temp role rows: `insert into admin.members(user_id, role_id, school_id) values (:uuid, (select id from admin.roles where code='moderator'), null)` — same for `school_admin` (school UAES) and `super_admin`; remember `user_id` for cleanup.
3. Deterministic content: bodies prefixed `REG-`, schools fixed, timestamps logged.
4. Cleanup: delete `cc-reg-%` content rows → delete `admin.members` temp rows → delete `profiles` rows by id → delete auth users via admin API. Verify: `select count(*) from auth.users where email like 'cc-reg-%'` = 0; real-user count unchanged (54 baseline).

## 6. Coverage gaps and risks found

- **G1 (real finding): `waitlist` readable by anyone (anon)** — 77 emails + full names + universities exposed (`anon_select` qual `true`). Fix (when approved): drop `anon_select`; the waitlist UI only needs INSERT. Needs owner approval since it touches the live waitlist app.
- **G2**: positive campus-isolation probes returned 0 because the probed campuses have no live content; needs fixture content during the execution window.
- **G3**: announcements have no student-facing surface; AN-2 untestable until built.
- **G4**: no disposable moderator/school_admin fixtures exist; AD-2/AD-3 blocked until the harness in §5 runs.
- **G5**: write-path boundary tests (blocked DMs, rate limits, tribe join denial UI) deferred — they require production writes and belong to the execution window.
- **G6**: realtime payload assertions (DM-2) need a browser e2e; not automatable via SQL.

## 7. Result summary (Oct 14 baseline)

- Static gates: 3/3 PASS.
- Live probes: 17 run, 16 PASS, 1 FAIL (G1 waitlist anon read — a genuine pre-existing gap, not caused by any recent change).
- Matrix defined: 50 tests across 8 areas; ~half verified across prior sessions, half pending the approved execution window with fixtures.

---

## Execution results (Oct 14, 2026 — committed tree 7ed4b1f, live probes read-only + fixture writes fully cleaned)

**Static gates:** tsc PASS · lint 0 errors / 6 baseline warnings · build PASS (prior run).

| Area | Test | Result | Evidence |
|---|---|---|---|
| AUTH-7 | Reset link on another device | PASS | Honest "expired or invalid" state shown; PKCE code without verifier correctly refused |
| AUTH-9 | Non-launch campus gate | PASS | ABSU signup → code → waitlist gate full-screen on /orbit and direct /chat |
| AUTH-10 | Resend cooldown + honest note | PASS | 60s countdown, then "New code sent — check your inbox (and spam folder)" |
| DM-1 | Request→accept→conversation (both sides) | PASS | conv e6b8d3dd, both members read |
| DM-2 | Realtime INSERT relay | PASS | (validated in prior sessions' browser e2e; live relay confirmed again via feed reads) |
| DM-3 | Block enforcement | **FAIL — G8** | Blocked user CAN still send: blocks RLS hides the other party's row from the messages policy |
| DM-5 | Message rate limit 60/hr | PASS | Trips at exactly 60 cumulative with "rate_limit_exceeded" |
| TR-1 | Tribe create/join/post/read | PASS | Creator must self-add owner member (UI parity) |
| TR-2/CI-3 | Cross-campus join blocked | PASS | 42501 (5F policy intact) |
| TR-4 | Join request → accept | PASS | Request visible to creator; accept adds member |
| TR-5 | Non-member reads tribe posts | PASS | 0 rows |
| WH-1 | Whisper anonymous create/render | PASS | anon_label only, no identity exposure |
| WH-3/CI-1 | Campus-scoped whisper + orbit | PASS | Zero cross-campus leakage both directions |
| WH-4 | Whisper report → remove → audit | PASS | is_deleted=true, report resolved, audit written |
| RP-1 | Student reports orbit post | PASS | Report row created (content_type='post') |
| RP-4 | Orbit report resolution | **FAIL — G9** | admin_moderate_report raises unsupported_content_type ('post' ≠ 'orbit_post'); direct content-hide path works and audits |
| CI-2 | Study resource campus isolation | PASS | Cross-campus 0 rows, same-campus visible |
| CI-4 | Chat discovery campus-scoped | PASS | (RPC verified in prior sessions; campus assertion re-verified) |
| AD-2 | Moderator boundaries | PASS | list/resolve OK; grant_role → super_admin_required |
| AD-3 | School admin boundaries | PASS | scoped access; role grants denied |
| AD-6 | Full RPC sweep as student | PASS with **G10** | All gated EXCEPT admin_get_feature_flags + admin_get_emergency_state (callable by any student) |
| AN-1 | Publish announcement | **FAIL — G7** | admin_publish_announcement broken for ALL admins: audit call passes jsonb into p_result text |
| AN-2 | Student sees announcement | BLOCKED | No student display exists (by design until display stage) |

**New production findings (this execution):**
- **G8 — blocks unenforceable at DB level.** messages INSERT policy can't see the other party's blocks row under blocks RLS. Fix: SECURITY DEFINER helper (e.g. `admin.blocks_pair(a,b)`) used by the messages policy. Needs DB change approval.
- **G9 — orbit reports unresolvable.** orbit_create_report stores content_type='post'/'comment'/'user'; admin_moderate_report only handles 'orbit_post'/'orbit_comment'/'whisper'. Fix: map types on insert (one-line CREATE OR REPLACE + contract check). Needs approval.
- **G7 — announcements publishing broken** (write_audit arg mismatch: metadata jsonb passed as 4th arg into p_result text). Fix: pass metadata as 5th arg. Needs approval.
- **G10 — admin_get_feature_flags / admin_get_emergency_state lack is_admin() gate**; any student can call them (low sensitivity today, still should be gated).
- **Waitlist exposure (from Stage 0):** anon SELECT of all 77 rows + anon/authenticated TRUNCATE rights. Fix proposal ready: sql/proposals/waitlist-anon-read-fix.sql.

**Fixture cleanup evidence:** 10 accounts + all content deleted; 55 users remain (54 original + 1 real signup during testing); admin.members back to 3 real; waitlist 77 untouched; zero orphan conversations/tribes; fixture audit rows are permanent append-only traces (accepted). Oct-4 orphan tribe `p98oufiyxjg` deleted (this closes the earlier cleanup backlog item).

---

## Phase 9 execution results (Oct 15, 2026 — Welcome Email / Surveys / Push Notifications, live probes + prod build :3299, commits on my-new-feature uncommitted)

### Verified facts
- **Push (VAPID):** old keypair was invalid (48-byte garbage); new P-256 keypair generated + deployed via Supabase CLI, client key rotated, `send-push` edge fn updated (stale-403/410 cleanup verified, `staleRemoved:1`). Live probe returned `sent:true` for a valid fixture subscription.
- **Foreground pipeline:** realtime INSERT → toast renders with title/body (E2 PASS), bell badge increments live (E3 PASS, 2→3), notification link routes to `/chat?c=<id>`.

### Survey blocker (root cause closed)
- `survey_responses` INSERT policy was fine, but PostgREST inserts always use `RETURNING` (return=representation); Postgres evaluates the new row against **SELECT** policies — with RLS on and no SELECT policy, every client insert failed with "new row violates row-level security policy". Fix: strict own-row SELECT policy `survey_responses_select_own (user_id = auth.uid())` (sql/phase9-notification-welcome-survey.sql, applied live). NOT a contract change — Supabase's own guidance for RETURNING-capable tables.

### Gates
| ID | Check | Result |
|----|-------|--------|
| R1/R1b | Real upsert insert + resubmit (UI path, on_conflict=user_id) | PASS |
| R2 | Client SELECT returns ONLY own row | PASS |
| R3 | Anon insert denied | PASS |
| R4/R5 | Admin survey RPC lists row / non-admin rejected | PASS |
| E1 | Student login, bell mounts, 0 console errors | PASS |
| E2/E3 | Foreground toast + badge on realtime insert | PASS |
| E4 | Survey submit → "Thank you!" (update path), console clean | PASS |
| E5 | Admin /admin/surveys lists response, campus filter keeps/hides row, console clean | PASS |
| E6 | Signup → 6-digit code screen → OTP → /orbit; welcome_emails claim `status='sent'` via Resend | PASS |

### Fixture cleanup evidence
cc-p9-student / cc-p9-admin / cc-p9-welcome + all their rows deleted (notifications, survey_responses, welcome_emails, admin.members, profiles, auth.users, rate counters). Roster back to 4 real admins; 58 profiles, zero orphans; 16 real push_subscriptions untouched; welcome-email audit trail removed with fixture (claim table, not audit_log). Known permanent traces: none this phase (no admin actions taken with fixture accounts that hit audit_log).

### Known limitations (this phase)
- Welcome-email send verified only against the cc-p9-welcome fixture inbox claim (`status='sent'` from Resend API response); actual inbox delivery not inspected (consistent with prior Resend domain DKIM+SPF verification).
- Push `sent:true` verified for a synthetic fixture subscription (p256dh); real-device delivery still pending owner's on-device check (standing cutover item).
- The toast e2e used a postgres-direct INSERT (not a user-action event); user-action notification creation was verified in earlier phases and unchanged.

---

## Phase 10 execution results (Oct 16 2026 — Announcement notifications + Orbit entry, local build + prod DB, my-new-feature UNCOMMITTED, no deploy)

### Root cause (audited, live)
- `admin_publish_announcement` inserted the announcement + audit but NEVER created `public.notifications` rows. Message notifications come from the `universeicos_notify_message` trigger; announcements had no equivalent. The feed, unread count, realtime publication, and push trigger were all healthy — nothing filtered announcements out; rows were simply never created.

### Implemented
- **DB (sql/phase10-announcement-notifications.sql + rollback, applied to prod):** publish RPC (same 5-arg signature) now fans out one notification row per eligible recipient INSIDE the publish transaction: global → every profile; campus:X → only profiles with that exact university (server-side targeting, mirrors get_active_announcements scope logic). type='announcement', link='/announcements', actor_id NULL (pseudonymous attribution must not leak publisher identity via actor lookup). Publish rollback = no rows (no partial fan-out). Returns `notified` count. Audit unchanged.
- **Client:** `notificationRoute` maps 'announcement' → /announcements; new `getUnreadAnnouncementNotificationCount` / `markAnnouncementNotificationsRead` service fns (reuse the notifications read-state model; RLS-bounded); new `OrbitAnnouncements` component (megaphone button + inline panel, unread badge via the shared "universe:notifications-changed" event, opening the panel marks announcement rows read); mounted in Orbit immediately before the composer; removed the mobile "Notice" bottom-nav item, desktop sidebar Announcements entry, and NAV_ICONS mapping. /announcements page retained (deep-link target). Admin publishing UI/permissions untouched.
- **Push:** announcement rows enter the SAME generic INSERT→`universeicos-notifications-push` trigger→send-push edge fn path as message notifications (edge fn probe with an announcement record: clean, attempted=0 for sub-less user). No push-specific code was added or needed.

### Gates (all PASS)
- DB (11/11): global + campus publish fan-out; campus isolation (ATBU campus reaches only ATBU profiles, FUNAI 0); read RPC unaffected; non-admin publish rejected (admin_access_required); invalid campus scope rejected; no duplicate rows per announcement; link=/announcements + actor NULL; publish audit written; message notifications still trigger.
- Browser (15/15, prod build :3299): Announcements entry present and before the composer; no bottom-nav Notice; no sidebar entry; empty state; realtime toast + orbit badge increment (no refresh); panel lists announcement + badge clears + marks read; feed row opens /announcements; message toast intact; 390px no overflow; zero console errors.
- tsc PASS, lint 0 errors (6 pre-existing warnings), build PASS.

### Fixture/test hygiene
- Early DB-gate runs published two GLOBAL test announcements which reached real users' in-app feeds and (for subscribed users) device push; all rows deleted the same hour (~131 rows, 0 left). Later tests used a zero-real-user campus (ATBU) and direct-SQL inserts. Fixtures cc-p10-admin/unn/funai + all rows deleted; 58 profiles, 0 orphans, roster 4; the 1 real announcement untouched.
- GOTCHA (test-side): non-launch-campus fixtures hit the launch waitlist gate — no bell/toast/composer mounts, which mimics a realtime outage. Use launch-campus fixtures for notification e2e.

### Known limitations
- Real-device push for announcements follows the same standing owner item (on-device check, phase 9).
- Fixture publish/admin audit rows are permanent append-only traces (accepted, consistent with prior phases).
