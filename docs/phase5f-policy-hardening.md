# Phase 5F — Policy hardening: the two deferred RLS risks

**Status: APPLIED + LIVE-VERIFIED (Sept 29 2026, owner approved).** SQL: `sql/phase5f-policy-hardening.sql`
(rollback included in the file).

Audit date: Sept 29 2026, after the write-path sweep shipped at `d412c48`.
Both risks were first documented in the Phase 4E audit (Sept 26) and were
deliberately deferred pending owner approval. A fresh read-only audit today
confirms both are still live, unchanged, in the production database.

## Risk 1 — study_courses UPDATE is campus-wide, not creator-scoped

**Verified fact.** Policy `course creators can update study courses`:

```sql
USING      (university = study_current_university())
WITH CHECK (university = study_current_university())
```

Any authenticated student can UPDATE any course row at their own campus —
rename a course, change its code, change its title. The policy name says
"course creators" but the expression has no ownership check.

**Why it can't be fixed with ownership:** `study_courses` has no `created_by`
column (columns: id, university, course_code, course_title, department,
level, created_at, updated_at). An ownership fix would be a schema change.

**Proposal (Option A, recommended):** drop the UPDATE policy entirely.
The new UI offers no course editing by design, so no legitimate user flow
breaks; courses become immutable campus reference data. If course editing
ever ships, design it properly then (add `created_by`, scope the policy).

**Option B (not recommended now):** add `created_by uuid default auth.uid()`
and scope UPDATE to it. More work, speculative — no editing UI exists.

**Relevance today:** low — `study_courses` currently has 0 rows. But the
table fills as soon as students upload resources with a course code, and
then every course at a campus is editable by every student there.

## Risk 2 — tribe_members INSERT ignores campus

**Verified fact.** Policy `users can join/leave tribes themselves`:

```sql
WITH CHECK (user_id = auth.uid())
```

No campus check. A user with a tribe UUID from ANOTHER campus can insert a
membership row for themselves, then read (SELECT policy is same-campus on
the tribes table, but member reads go through membership) and post in that
tribe — both gated on membership, not campus.

**Proposal:** replace with a campus-scoped INSERT policy — same rule the
existing SELECT policy already applies (`tribes.university = caller's
university`). Self-join stays one click in the UI; cross-campus joins with
a leaked UUID get blocked at the DB layer.

**Relevance today:** moderate — 2 tribes exist, and tribe discovery is
already same-campus, so this only matters when a UUID leaks outside campus
(link, guess, or scrape). It is a defense-in-depth fix, one policy swap.

## Verification plan (after approval, apply then verify)

All steps executed Sept 29 2026, as a real throwaway UNN user
(cc-5f@universeicos.app, created via the real signup API, deleted after):

1. Applied via management API; `pg_policies` confirmed the new quals.
2. Join own-campus tribe (Firts Tribe) → INSERT succeeded.
3. Join other-campus tribe (ajax, UAES, known UUID) → 42501 blocked.
4. UPDATE study_courses (seeded SWEEP101 row) → 0 rows affected; title
   untouched in DB (no UPDATE policy exists for the student role).
5. Browser e2e: one-click Join from /study/tribes → button flipped to
   Leave, zero console errors.
6. All test data cleaned (membership, course row, account, rate counters).

## Explicitly out of scope

- No schema changes (no `created_by` column) under Option A.
- The DELETE policy on tribe_members (leave) is already correctly scoped.
- study_resources UPDATE/DELETE are already uploader-scoped (verified today).
