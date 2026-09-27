-- Fix: admin RPCs referenced profiles.created_at, which does not exist.
-- profiles has never had a created_at column; account creation time lives
-- in auth.users.created_at. These RPCs were never executable before the
-- admin gate fix (b33fb19), so the bug stayed latent until now.
--
-- Changes (presentation of data unchanged, same columns returned):
--   admin_get_overview: users subquery selects/orders by au.created_at
--   admin_list_users:   selects/orders by au.created_at
--   admin_get_user:     same created_at source; also renames the PL/pgSQL
--                       record variable 'p' to 'rec' — the old variable name
--                       collided with the profiles table alias (same latent
--                       55000 bug class as admin_bootstrap).
--   admin_list_users:   additionally casts au.email::text — the function
--                       declares RETURNS TABLE(email text) but auth.users
--                       .email is varchar(255), a 42804 mismatch that
--                       crashed every call (pre-existing, surfaced during
--                       live verification of this fix). Return shape
--                       unchanged.
-- No RLS, grants, or table changes. SECURITY DEFINER / gates unchanged.

-- 1) admin_get_overview ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'admin', 'public', 'pg_catalog'
AS $function$
declare u bigint; v bigint; active24 bigint; reports bigint; campuses bigint; sessions bigint;
begin
 if not admin.is_admin() then raise exception 'admin_access_required'; end if;
 select count(*) into u from public.profiles;
 select count(*) into v from public.profiles where is_verified=true;
 select count(*) into active24 from auth.users where last_sign_in_at >= now()-interval '24 hours';
 select count(*) into reports from public.reports where coalesce(status,'open') in ('open','pending');
 select count(*) into campuses from public.schools;
 select count(*) into sessions from auth.sessions where not_after > now();
 return jsonb_build_object(
  'mode','live','total_users',u,'verified_users',v,'active_today',active24,'pending_reports',reports,'campuses',campuses,'active_sessions',sessions,
  'pulse',jsonb_build_object(
    'Orbit',(select count(*) from public.orbit_feed), 'Chat',(select count(*) from public.messages),
    'Study resources',(select count(*) from public.study_resources), 'Whisper',(select count(*) from public.whisper_posts where coalesce(is_deleted,false)=false),
    'Errands',(select count(*) from public.errands), 'Lodges',(select count(*) from public.lodges),
    'Marketplace',(select count(*) from public.market), 'Hustles',(select count(*) from public.hustles),
    'Reports',(select count(*) from public.reports), 'Notifications',(select count(*) from public.notifications)
  ),
  'universities',(select coalesce(jsonb_agg(x order by x.registered_users desc), '[]'::jsonb) from (
      select coalesce(nullif(trim(p.university),''),'Unknown / not set') university,count(*)::bigint registered_users,
             count(*) filter(where p.is_verified=true)::bigint verified_users,
             count(*) filter(where au.last_sign_in_at >= now()-interval '24 hours')::bigint active_24h
      from public.profiles p join auth.users au on au.id=p.id group by 1 order by count(*) desc,1 limit 100
    ) x),
  'users',(select coalesce(jsonb_agg(x order by x.created_at desc),'[]'::jsonb) from (
      select p.id,p.full_name,au.email,p.university,p.department,p.level,p.is_verified,p.account_status,au.created_at,au.last_sign_in_at,
             coalesce(uc.is_suspended,false) is_suspended
      from public.profiles p join auth.users au on au.id=p.id left join admin.user_controls uc on uc.user_id=p.id
      order by au.created_at desc limit 250
    ) x),
  'recent_activity',(select coalesce(jsonb_agg(x order by x.created_at desc),'[]'::jsonb) from (
      select a.id,a.created_at,a.actor_id,coalesce(p.full_name,au.email,'System') actor_name,a.action,a.entity_type,a.entity_id,a.result,a.metadata
      from admin.site_activity a left join public.profiles p on p.id=a.actor_id left join auth.users au on au.id=a.actor_id
      order by a.created_at desc limit 500
    ) x),
  'auth_activity',(select coalesce(jsonb_agg(x order by x.created_at desc),'[]'::jsonb) from (
      select id,created_at,ip_address,payload->>'action' action,payload->>'user_id' user_id,payload->'metadata' metadata
      from auth.audit_log_entries order by created_at desc limit 250
    ) x),
  'attention',case when reports>0 then jsonb_build_array(jsonb_build_object('title','Reports waiting','detail',reports||' report(s) need review','action','moderation')) else '[]'::jsonb end
 );
end; $function$;

-- 2) admin_list_users -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_users(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, full_name text, email text, university text, school_tag text, department text, level text, is_verified boolean, is_suspended boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'admin', 'public', 'pg_catalog'
AS $function$
begin
 if not admin.is_admin() then raise exception 'admin_access_required'; end if;
 return query
 select p.id,p.full_name,au.email::text,p.university,null::text,p.department,p.level,p.is_verified,coalesce(uc.is_suspended,false),au.created_at
 from public.profiles p join auth.users au on au.id=p.id
 left join admin.user_controls uc on uc.user_id=p.id
 where p_search is null or p.full_name ilike '%'||p_search||'%' or au.email ilike '%'||p_search||'%' or p.university ilike '%'||p_search||'%'
 order by au.created_at desc limit greatest(1,least(p_limit,500));
end;$function$;

-- 3) admin_get_user -------------------------------------------------------
-- (not currently called by the frontend; fixed to keep the RPC family sound)
CREATE OR REPLACE FUNCTION public.admin_get_user(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'admin', 'public', 'pg_catalog'
AS $function$
declare rec record; e text; suspended boolean; created timestamptz;
begin
 if not admin.is_admin() then raise exception 'admin_access_required'; end if;
 select pr.* into rec from public.profiles pr where pr.id=p_user_id;
 if not found then raise exception 'user_not_found'; end if;
 select au.email, au.created_at into e, created from auth.users au where au.id=p_user_id;
 select coalesce(uc.is_suspended,false) into suspended from admin.user_controls uc where uc.user_id=p_user_id;
 return jsonb_build_object('id',rec.id,'full_name',rec.full_name,'email',e,'university',rec.university,'department',rec.department,'level',rec.level,'is_verified',rec.is_verified,'is_suspended',coalesce(suspended,false),'created_at',created);
end;$function$;
