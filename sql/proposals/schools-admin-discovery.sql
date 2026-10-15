-- ============================================================================
-- UniVerse ICOS — Admin Schools discovery + details (PROPOSAL, NOT APPLIED)
-- ============================================================================
-- STATUS: PROPOSAL — NOT APPLIED. Written Oct 15 2026. Applies only after a
-- live read-only preflight (the management token expired mid-session; the
-- schools/waitlist/profiles column assumptions below are backed by repo
-- evidence and prior live audits, recorded in the PREFLIGHT).
--
-- CONTEXT / DESIGN
--   The Schools console becomes a campus management & discovery page:
--   * DEFAULT VIEW shows ONLY the five pioneer (launch) schools. That
--     identification lives in the canonical client data (src/lib/launch.ts,
--     exact schools.name values) and is applied client-side — the DEFAULT
--     list needs NO new RPC (the existing admin_list_schools result is
--     filtered by exact name). Nothing is hidden or deleted in the DB.
--   * SEARCH lets an admin find ANY school (name or tag, authoritative
--     schools table, including schools with zero users) — this is the new
--     admin_search_schools RPC below.
--   * DETAILS per school: registered users (public.profiles.university =
--     schools.name — the mapping the launch gate and announcements scope
--     already rely on), waitlisted users (public.waitlist.university, shown
--     separately), new registrations in the last 30 days, plus the existing
--     registry/verification fields. ACTIVE USERS: the platform has NO
--     persisted activity signal (presence is ephemeral Realtime; there is
--     no last_active column) — the UI labels this metric unavailable rather
--     than inventing a definition. No new tracking is added by this change.
--   * ASSOCIATED USERS list: metadata only (id, full_name, department,
--     level, is_verified, student_verified, account_status, created_at) —
--     deliberately NO admin_note, NO wallet_balance, no emails. Search by
--     name, real pagination (limit/offset + total) executed in SQL.
--
-- SECURITY
--   * All three RPCs: SECURITY DEFINER, fixed search_path, admin-gated via
--     admin.is_admin() (the established console gate — same as
--     admin_list_schools / admin_list_users), EXECUTE authenticated only,
--     anon revoked. Students and ambassadors can never call them.
--   * A school appearing in search gains NO privileges: nothing in the grant
--     or gate layer reads this RPC; read-only.
--
-- Rollback: sql/proposals/schools-admin-discovery.rollback.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PREFLIGHT (read-only, run BEFORE applying; abort on any mismatch)
-- ----------------------------------------------------------------------------
-- P1. Confirm columns exist and shapes match (search/details RPCs touch ONLY
--     id, name, tag on schools; verification_enabled / is_active / registry
--     student_count come from the EXISTING admin_list_schools RPC and are
--     merged client-side, so their provenance does not matter here):
--     select column_name from information_schema.columns
--      where table_schema='public' and table_name='schools';
--     expect (at least): id, name, tag  [+ rules / verification_enabled /
--     is_active per admin_list_schools's return]
-- P2. public.profiles has: university (text), full_name, department, level,
--     is_verified, student_verified, account_status, created_at.
--     (account_status/admin_note are column-grant-denied to clients since
--     Phase 5C — this RPC is SECURITY DEFINER and reads it server-side for
--     admins only, which is the established admin_list_users pattern.)
-- P3. public.waitlist has: university, email, created_at.
-- P4. admin.is_admin() exists and is the console gate (it does).
-- P5. Spot-check the mapping the counts rely on:
--     select count(*) from public.profiles where university in
--       (select name from public.schools where name =
--        'University of Nigeria, Nsukka');   -- expect a plausible number

-- ----------------------------------------------------------------------------
-- MIGRATION
-- ----------------------------------------------------------------------------

-- 1) school search: authoritative records, paginated, with counts ---------
create or replace function public.admin_search_schools(
  p_query text,
  p_limit int,
  p_offset int
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, admin, pg_catalog
as $$
declare
  v_admin uuid := auth.uid();
  v_q text := btrim(coalesce(p_query, ''));
  v_rows jsonb;
  v_total int;
  v_limit int := least(coalesce(p_limit, 10), 50);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
begin
  if v_admin is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not admin.is_admin() then
    raise exception 'admin_access_required' using errcode = '42501';
  end if;

  select count(*) into v_total
  from public.schools s
  where v_q = '' or s.name ilike '%' || v_q || '%' or s.tag ilike '%' || v_q || '%';

  select coalesce(jsonb_agg(row_data order by sort_name, row_id), '[]'::jsonb) into v_rows
  from (
    select s.id as row_id,
           s.name as sort_name,
           jsonb_build_object(
             'id', s.id,
             'name', s.name,
             'tag', s.tag,
             'registered_users',
               (select count(*) from public.profiles p where p.university = s.name),
             'waitlisted_users',
               (select count(*) from public.waitlist w where w.university = s.name),
             'new_users_30d',
               (select count(*) from public.profiles p
                where p.university = s.name and p.created_at > now() - interval '30 days')
           ) as row_data
    from public.schools s
    where v_q = '' or s.name ilike '%' || v_q || '%' or s.tag ilike '%' || v_q || '%'
    order by s.name
    limit v_limit offset v_offset
  ) page;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

revoke execute on function public.admin_search_schools(text, int, int) from public, anon;
grant execute on function public.admin_search_schools(text, int, int) to authenticated;

-- 2) school details ---------------------------------------------------------
create or replace function public.admin_get_school_details(
  p_school_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, admin, pg_catalog
as $$
declare
  v_admin uuid := auth.uid();
  v_school record;
begin
  if v_admin is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not admin.is_admin() then
    raise exception 'admin_access_required' using errcode = '42501';
  end if;

  select s.id, s.name, s.tag
  into v_school
  from public.schools s
  where s.id = p_school_id;

  if v_school.id is null then
    raise exception 'school_not_found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id', v_school.id,
    'name', v_school.name,
    'tag', v_school.tag,
    'registered_users',
      (select count(*) from public.profiles p where p.university = v_school.name),
    'waitlisted_users',
      (select count(*) from public.waitlist w where w.university = v_school.name),
    'new_users_30d',
      (select count(*) from public.profiles p
       where p.university = v_school.name and p.created_at > now() - interval '30 days'),
    'new_users_7d',
      (select count(*) from public.profiles p
       where p.university = v_school.name and p.created_at > now() - interval '7 days'),
    'registered_all_time',
      (select count(*) from public.profiles p where p.university = v_school.name)
  );
end;
$$;

revoke execute on function public.admin_get_school_details(uuid) from public, anon;
grant execute on function public.admin_get_school_details(uuid) to authenticated;

-- 3) school users: metadata only, searched + paginated in SQL -------------
create or replace function public.admin_list_school_users(
  p_school_id uuid,
  p_search text,
  p_limit int,
  p_offset int
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, admin, pg_catalog
as $$
declare
  v_admin uuid := auth.uid();
  v_q text := btrim(coalesce(p_search, ''));
  v_school record;
  v_rows jsonb;
  v_total int;
  v_limit int := least(coalesce(p_limit, 10), 50);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
begin
  if v_admin is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not admin.is_admin() then
    raise exception 'admin_access_required' using errcode = '42501';
  end if;

  select s.id, s.name into v_school
  from public.schools s where s.id = p_school_id;

  if v_school.id is null then
    raise exception 'school_not_found' using errcode = 'P0002';
  end if;

  select count(*) into v_total
  from public.profiles p
  where p.university = v_school.name
    and (v_q = '' or p.full_name ilike '%' || v_q || '%');

  select coalesce(jsonb_agg(row_data order by row_created desc), '[]'::jsonb) into v_rows
  from (
    select p.created_at as row_created,
           jsonb_build_object(
             'id', p.id,
             'full_name', p.full_name,
             'department', p.department,
             'level', p.level,
             'is_verified', p.is_verified,
             'student_verified', p.student_verified,
             'account_status', p.account_status,
             'created_at', p.created_at
           ) as row_data
    from public.profiles p
    where p.university = v_school.name
      and (v_q = '' or p.full_name ilike '%' || v_q || '%')
    order by p.created_at desc
    limit v_limit offset v_offset
  ) page;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

revoke execute on function public.admin_list_school_users(uuid, text, int, int) from public, anon;
grant execute on function public.admin_list_school_users(uuid, text, int, int) to authenticated;

-- ----------------------------------------------------------------------------
-- VERIFICATION (read-only, AFTER applying)
-- ----------------------------------------------------------------------------
-- V1. anon JWT on all three RPCs → 42501.
-- V2. Student JWT → admin_access_required (42501) — including the search RPC
--     (students must not be able to enumerate schools' user counts).
-- V3. Admin JWT: search 'Nsukka' → UNN with registered_users equal to
--     select count(*) from profiles where university = 'University of
--     Nigeria, Nsukka'; search a tag (e.g. 'unn') → same school.
-- V4. Search finds a school with zero users (e.g. a registry-only school).
-- V5. Pagination: total from search must equal the unfiltered ILIKE count;
--     page 2 offset repeats no rows from page 1.
-- V6. admin_list_school_users: metadata fields exactly as specified (no
--     admin_note, no wallet_balance, no email), search + pagination in SQL.
-- V7. Details: waitlisted_users distinct from registered_users (different
--     tables), new_users_30d <= registered_users.
