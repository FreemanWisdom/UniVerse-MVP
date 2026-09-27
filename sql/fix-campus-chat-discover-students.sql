CREATE OR REPLACE FUNCTION public.campus_chat_discover_students(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, university text, department text, level text, bio text, is_verified boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_caller uuid := auth.uid();
    v_university text;
begin
    if v_caller is null then
        raise exception 'Not authenticated' using errcode = '42501';
    end if;
    -- FIX (42702): the RETURNS TABLE output parameter named "university" collided
    -- with the unqualified profiles column below. Qualify the column with an alias.
    select pr.university into v_university from public.profiles pr where pr.id = v_caller;
    if nullif(btrim(v_university),'') is null then return; end if;
    p_limit := least(greatest(coalesce(p_limit,20),1),60);
    return query
    select p.id,p.full_name,p.avatar_url,p.university,p.department,p.level,p.bio,p.is_verified
    from public.profiles p
    where p.university = v_university
      and p.id <> v_caller
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id=v_caller and b.blocked_id=p.id)
           or (b.blocker_id=p.id and b.blocked_id=v_caller)
      )
    order by p.full_name asc nulls last
    limit p_limit offset greatest(coalesce(p_offset,0),0);
end;
$function$
