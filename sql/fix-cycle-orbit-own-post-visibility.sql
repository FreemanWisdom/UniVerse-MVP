-- Fix cycle (Oct 2 2026) — Orbit own-post deletion RLS failure
--
-- Defect: a student's soft-delete of their own Orbit post (UPDATE status='deleted')
-- was rejected with 42501 "new row violates row-level security policy".
--
-- Root cause: PostgreSQL applies the table's SELECT policies to the NEW row
-- version during an UPDATE, in addition to the UPDATE policy's WITH CHECK.
-- The updated row (status='deleted') fails orbit_read_same_campus (which
-- requires status='active'), so even the rightful author could not mark their
-- own post deleted. Students have never been able to delete their own posts.
--
-- Fix: add a permissive SELECT policy letting authors read their own posts in
-- any status. The new row version then passes the SELECT check for the author.
-- Everyone else's visibility is unchanged (orbit_read_same_campus still governs
-- other readers); cross-user UPDATE/DELETE stay blocked by
-- orbit_update_own_post / orbit_delete_own_post (USING poster_id = auth.uid()).
-- The frontend feed already filters status='active' in code, so deleted posts
-- never reappear in the author's own feed.
--
-- Applied live: 2026-10-02, verified: author delete 204 + row status='deleted',
-- second-user delete attempt 0 rows affected (row stays 'active').

CREATE POLICY orbit_read_own_posts
  ON public.orbit_feed
  FOR SELECT
  TO authenticated
  USING (poster_id = auth.uid());

-- Rollback:
--   DROP POLICY orbit_read_own_posts ON public.orbit_feed;
