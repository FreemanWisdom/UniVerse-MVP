-- ============================================================================
-- UniVerse ICOS — Admin Schools discovery + details — ROLLBACK (NOT RUN)
-- ============================================================================

begin;

drop function if exists public.admin_list_school_users(uuid, text, int, int);
drop function if exists public.admin_get_school_details(uuid);
drop function if exists public.admin_search_schools(text, int, int);

commit;

-- Read-only feature: no data was written, nothing else to undo.
