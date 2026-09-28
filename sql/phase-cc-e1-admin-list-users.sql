-- Phase CC-E1: admin_list_users — server-side filtering + pagination (approved Sept 28 2026)
-- Scope: add p_university, p_status, p_verified, p_student_verified, p_offset; add account_status
--        to the returned row (additive); fix is_suspended to read profiles.account_status (the
--        state admin_update_user actually writes). admin.user_controls is a legacy table with
--        0 rows — deriving is_suspended from it always returned false (latent bug).
-- Return type changes (new column) so the old overload is dropped and recreated; EXECUTE is
-- re-granted to authenticated only. Authorization gate (admin.is_admin) unchanged.

drop function if exists public.admin_list_users(p_search text, p_limit integer);

create function public.admin_list_users(
  p_search text default null,
  p_limit integer default 100,
  p_university text default null,
  p_status text default null,
  p_verified boolean default null,
  p_student_verified boolean default null,
  p_offset integer default 0
)
returns table(
  id uuid,
  full_name text,
  email text,
  university text,
  school_tag text,
  department text,
  level text,
  is_verified boolean,
  is_suspended boolean,
  student_verified boolean,
  created_at timestamptz,
  account_status text
)
language plpgsql
security definer
set search_path = 'admin', 'public', 'pg_catalog'
as $$
begin
  if not admin.is_admin() then raise exception 'admin_access_required'; end if;
  if p_status is not null and p_status not in ('active','suspended','banned','restricted') then
    raise exception 'invalid_status_filter';
  end if;
  return query
  select
    p.id,
    p.full_name,
    au.email::text,
    p.university,
    null::text,
    p.department,
    p.level,
    p.is_verified,
    coalesce(p.account_status, 'active') = 'suspended',
    p.student_verified,
    au.created_at,
    coalesce(p.account_status, 'active')::text
  from public.profiles p
  join auth.users au on au.id = p.id
  where (p_search is null or btrim(p_search) = ''
         or p.full_name ilike '%' || p_search || '%'
         or au.email ilike '%' || p_search || '%'
         or p.university ilike '%' || p_search || '%')
    and (p_university is null or btrim(p_university) = ''
         or lower(p.university) = lower(btrim(p_university)))
    and (p_status is null or coalesce(p.account_status, 'active') = p_status)
    and (p_verified is null or p.is_verified = p_verified)
    and (p_student_verified is null or p.student_verified = p_student_verified)
  order by au.created_at desc, p.id desc
  limit greatest(1, least(coalesce(p_limit, 100), 500))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke execute on function public.admin_list_users(text, integer, text, text, boolean, boolean, integer) from anon;
grant execute on function public.admin_list_users(text, integer, text, text, boolean, boolean, integer) to authenticated;
