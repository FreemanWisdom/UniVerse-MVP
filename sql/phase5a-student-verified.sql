-- Phase 5A — student_verified column + admin-granted badge (owner-approved)
-- Freeman's decisions (Sept 27 2026): DP-1 = admin-granted badge only (no new
-- consume-and-persist RPC); DP-2 = new student_verified column; is_verified
-- semantics unchanged.
--
-- Scope of this file (STRICTLY Phase 5A):
--   1. public.profiles: ADD COLUMN student_verified boolean NOT NULL DEFAULT false
--   2. guard_profile_client_mutation(): protect the new column from client
--      writes (same treatment as is_verified)
--   3. admin_update_user(): new actions 'student_verify' / 'student_unverify'
--      (same admin gate + school scope + write_audit as existing actions)
--   4. admin_list_users(): return student_verified (drop/recreate — return
--      type change; EXECUTE re-granted to authenticated, anon never had it)
--   5. admin_get_user(): include student_verified in the returned jsonb
--
-- Data migration: NONE — existing rows take the default (false).
-- is_verified: untouched everywhere (column, trigger, RPCs, semantics).
-- No RLS policy changes; no other tables/RPCs/auth behavior modified.

-- 1) Column ----------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_verified boolean NOT NULL DEFAULT false;

-- 2) Guard trigger: clients cannot forge the badge --------------------------
-- Same pattern as is_verified: INSERT forces false, UPDATE preserves the
-- stored value. Admin RPCs and DB-level triggers pass through unchanged.
CREATE OR REPLACE FUNCTION public.guard_profile_client_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'admin'
AS $function$
begin
  -- Database triggers (including the auth sync trigger) and admin RPCs must
  -- retain full control. Normal authenticated clients only get editable
  -- profile fields; server-owned/account-control fields cannot be forged.
  if auth.uid() is null or admin.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.id <> auth.uid() then
      raise exception 'profile_owner_required' using errcode='42501';
    end if;
    new.is_verified := false;
    new.student_verified := false;
    new.wallet_balance := 0;
    new.reputation_stars := 0;
    new.account_status := 'active';
    new.admin_note := null;
  elsif tg_op = 'UPDATE' then
    new.id := old.id;
    new.university := old.university;
    new.is_verified := old.is_verified;
    new.student_verified := old.student_verified;
    new.wallet_balance := old.wallet_balance;
    new.reputation_stars := old.reputation_stars;
    new.account_status := old.account_status;
    new.admin_note := old.admin_note;
  end if;
  return new;
end;
$function$;

-- 3) Admin action: grant/revoke the student badge ---------------------------
CREATE OR REPLACE FUNCTION public.admin_update_user(p_user_id uuid, p_action text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'admin', 'public', 'pg_catalog'
AS $function$
declare target_school uuid; current_role text;
begin
 if not admin.is_admin() then raise exception 'admin_access_required'; end if;
 select s.id into target_school from public.profiles p left join public.schools s on lower(s.name)=lower(p.university) where p.id=p_user_id limit 1;
 if admin.role_name() not in ('super_admin','platform_admin') and not admin.can_manage(target_school) then raise exception 'school_scope_denied'; end if;
 if p_action='verify' then update public.profiles set is_verified=true where id=p_user_id;
 elsif p_action='unverify' then update public.profiles set is_verified=false where id=p_user_id;
 elsif p_action='student_verify' then update public.profiles set student_verified=true where id=p_user_id;
 elsif p_action='student_unverify' then update public.profiles set student_verified=false where id=p_user_id;
 elsif p_action='suspend' then update public.profiles set account_status='suspended',admin_note=coalesce(p_note,admin_note) where id=p_user_id;
 elsif p_action='unsuspend' then update public.profiles set account_status='active',admin_note=coalesce(p_note,admin_note) where id=p_user_id;
 elsif p_action='ban' then update public.profiles set account_status='banned',admin_note=coalesce(p_note,admin_note) where id=p_user_id;
 elsif p_action='restrict' then update public.profiles set account_status='restricted',admin_note=coalesce(p_note,admin_note) where id=p_user_id;
 elsif p_action='unrestrict' then update public.profiles set account_status='active',admin_note=coalesce(p_note,admin_note) where id=p_user_id;
 else raise exception 'invalid_user_action'; end if;
 if not found then raise exception 'user_not_found'; end if;
 perform admin.write_audit('user_'||p_action,'user',p_user_id::text,'success',jsonb_build_object('note',p_note));
 return jsonb_build_object('ok',true,'action',p_action);
end;$function$;

-- 4) admin_list_users: expose student_verified (drop/recreate, re-grant) ----
DROP FUNCTION IF EXISTS public.admin_list_users(text, integer);

CREATE OR REPLACE FUNCTION public.admin_list_users(p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, full_name text, email text, university text, school_tag text, department text, level text, is_verified boolean, is_suspended boolean, student_verified boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'admin', 'public', 'pg_catalog'
AS $function$
begin
 if not admin.is_admin() then raise exception 'admin_access_required'; end if;
 return query
 select p.id,p.full_name,au.email::text,p.university,null::text,p.department,p.level,p.is_verified,coalesce(uc.is_suspended,false),p.student_verified,au.created_at
 from public.profiles p join auth.users au on au.id=p.id
 left join admin.user_controls uc on uc.user_id=p.id
 where p_search is null or p.full_name ilike '%'||p_search||'%' or au.email ilike '%'||p_search||'%' or p.university ilike '%'||p_search||'%'
 order by au.created_at desc limit greatest(1,least(p_limit,500));
end;$function$;

GRANT EXECUTE ON FUNCTION public.admin_list_users(text, integer) TO authenticated;

-- 5) admin_get_user: include student_verified (jsonb, no signature change) --
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
 return jsonb_build_object('id',rec.id,'full_name',rec.full_name,'email',e,'university',rec.university,'department',rec.department,'level',rec.level,'is_verified',rec.is_verified,'student_verified',rec.student_verified,'is_suspended',coalesce(suspended,false),'created_at',created);
end;$function$;
