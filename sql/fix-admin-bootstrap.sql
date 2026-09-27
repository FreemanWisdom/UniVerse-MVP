CREATE OR REPLACE FUNCTION public.admin_bootstrap()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'admin', 'public', 'pg_catalog'
AS $function$
declare r record;
begin
  if auth.uid() is null then return jsonb_build_object('authorized',false); end if;
  -- FIX (55000): the table alias "r" collided with the PL/pgSQL record variable
  -- "r" declared above — "r.name" resolved to the not-yet-assigned record.
  -- Renamed the alias to "ro" so "r" unambiguously means the record variable.
  select m.*, ro.name role_name, s.name school_name into r
  from admin.members m join admin.roles ro on ro.id=m.role_id
  left join public.schools s on s.id=m.school_id
  where m.user_id=auth.uid() and m.is_active=true limit 1;
  if not found then return jsonb_build_object('authorized',false); end if;
  perform admin.write_audit('admin_session_bootstrap','admin_member',auth.uid()::text);
  return jsonb_build_object('authorized',true,'admin',jsonb_build_object('user_id',r.user_id,'role',r.role_name,'school_id',r.school_id,'school_name',r.school_name));
end;$function$
