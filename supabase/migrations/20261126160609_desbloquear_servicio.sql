create function private.desbloquear_servicio(p_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(87194531);
  update private.servicios set bloqueado = false where id = p_id;
  if not found then return 'no_disponible'; end if;
  return 'desbloqueado';
end;
$$;
revoke all on function private.desbloquear_servicio(uuid) from public, anon;
grant execute on function private.desbloquear_servicio(uuid) to authenticated;
create function public.desbloquear_servicio(p_id uuid)
returns text language sql security invoker set search_path = '' as $$ select private.desbloquear_servicio(p_id); $$;
revoke all on function public.desbloquear_servicio(uuid) from public, anon;
grant execute on function public.desbloquear_servicio(uuid) to authenticated;
