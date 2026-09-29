# Phase 5F — Policy hardening: the two deferred RLS risks

**Status: PROPOSED — NOT APPLIED.** SQL draft: `sql/phase5f-policy-hardening.sql`
(requires owner approval; rollback included in the file).

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

1. Apply via management API; confirm `pg_policies` shows the new quals.
2. Simulated JWT, campus A caller:
   - join own-campus tribe → succeeds
   - join other-campus tribe (known UUID) → 42501 blocked
   - UPDATE own-campus course row → 42501 blocked
3. Browser e2e as throwaway: join tribe from the tribes page (UI one-click
   join still works), zero console errors.
4. Cleanup test rows; commit the SQL record to `my-new-feature`.

## Explicitly out of scope

- No schema changes (no `created_by` column) under Option A.
- The DELETE policy on tribe_members (leave) is already correctly scoped.
- study_resources UPDATE/DELETE are already uploader-scoped (verified today).
