-- =====================================================================
-- Phase 5F: Policy hardening — the two deferred RLS risks
-- Status: PROPOSED — NOT APPLIED. Requires Freeman's approval.
-- Audit date: Sept 29 2026 (d412c48). Read-only audit, live-verified.
--
-- RISK 1 (from Phase 4E audit, never resolved):
--   Policy "course creators can update study courses" on public.study_courses
--   grants UPDATE to ANY same-university user — no creator ownership check.
--   study_courses has NO created_by column, so an ownership fix would need a
--   schema change. The frontend offers no course-editing UI (by design),
--   so the cleanest hardening is to drop the UPDATE policy entirely.
--   Courses become immutable campus reference data (admins still can via
--   service role / SQL if ever needed).
--
-- RISK 2 (from Phase 4E audit, never resolved):
--   Policy "users can join/leave tribes themselves" on public.tribe_members
--   has WITH CHECK (user_id = auth.uid()) ONLY — a user who learns a tribe
--   UUID from another campus can join it, then read and post in that tribe
--   (both are gated on membership). Fix: require the tribe's university to
--   match the caller's campus, same rule the SELECT policy already uses.
-- =====================================================================

begin;

-- ---------- RISK 1: drop university-wide UPDATE on study_courses ----------
drop policy "course creators can update study courses" on public.study_courses;

-- ---------- RISK 2: campus-scope the tribe self-join policy ----------
drop policy "users can join/leave tribes themselves" on public.tribe_members;

create policy "users can join tribes on their own campus"
  on public.tribe_members
  for insert
  to public
  with check (
    user_id = auth.uid()
    and tribe_id in (
      select t.id
      from public.tribes t
      where t.university = (
        select p.university
        from public.profiles p
        where p.id = auth.uid()
      )
    )
  );

-- DELETE policy ("users can leave tribes themselves") is untouched:
-- leaving is already correctly scoped to user_id = auth.uid().

commit;

-- =====================================================================
-- ROLLBACK (revert to current state)
-- =====================================================================
-- begin;
-- create policy "course creators can update study courses"
--   on public.study_courses
--   for update
--   to public
--   using (university = study_current_university())
--   with check (university = study_current_university());
--
-- drop policy "users can join tribes on their own campus" on public.tribe_members;
-- create policy "users can join/leave tribes themselves"
--   on public.tribe_members
--   for insert
--   to public
--   with check (user_id = auth.uid());
-- commit;
