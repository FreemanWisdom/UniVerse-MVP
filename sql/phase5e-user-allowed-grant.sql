-- Phase 5E: grant EXECUTE on admin.user_allowed to authenticated
-- Applied live: 2026-09-29 (owner-approved in chat)
--
-- Why: every client INSERT whose RLS policy calls admin.user_allowed() fails with
-- 42501 "permission denied for function user_allowed" — orbit_feed, messages,
-- study_resources, tribe_posts, market, hustles, lodges. RLS policy expressions
-- evaluate with the invoking user's privileges, so EXECUTE is required even though
-- the function is SECURITY DEFINER. Only whisper was unaffected (its guard,
-- admin.enforce_whisper_write, is a SECURITY DEFINER trigger running as postgres).
-- Confirmed via browser: PostgREST 403 with code 42501 on orbit insert.
--
-- Preconditions checked:
--   * authenticated previously had NO EXECUTE on this function (information_schema.routine_privileges).
--   * Same grant pattern already exists for claim_initial_super_admin -> authenticated.
--   * Function is a STABLE read-only predicate (boolean by capability); exposes no data.

grant execute on function admin.user_allowed(uuid, text) to authenticated;

-- Verify (expect the authenticated row):
-- select grantee, routine_name from information_schema.routine_privileges
--   where routine_schema='admin' and routine_name='user_allowed';

-- Rollback:
-- revoke execute on function admin.user_allowed(uuid, text) from authenticated;
