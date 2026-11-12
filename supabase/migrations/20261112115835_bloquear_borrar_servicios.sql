alter table private.servicios add column bloqueado boolean not null default false;
alter table public.citas add column servicio_id uuid references private.servicios(id) on delete set null;
update public.citas c set servicio_id = s.id from private.servicios s where s.nombre = c.servicio;

do $$ begin
  if exists (select 1 from public.citas c where c.servicio_id is null and c.inicio > clock_timestamp()
    and c.estado in ('pendiente', 'confirmada', 'propuesta')) then
    raise exception 'Hay citas futuras activas con servicios que no pertenecen al catálogo';
  end if;
end $$;
create index citas_servicio_id_inicio_idx on public.citas (servicio_id, inicio);

create or replace function private.listar_servicios()
returns table (id uuid, nombre text) language sql stable security definer set search_path = '' as $$
  select s.id, s.nombre from private.servicios s where not s.bloqueado order by s.nombre, s.id;
$$;

create function private.listar_servicios_admin()
returns table (id uuid, nombre text, bloqueado boolean) language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  return query select s.id, s.nombre, s.bloqueado from private.servicios s order by s.nombre, s.id;
end;
$$;
revoke all on function private.listar_servicios_admin() from public, anon;
grant execute on function private.listar_servicios_admin() to authenticated;
create function public.listar_servicios_admin()
returns table (id uuid, nombre text, bloqueado boolean) language sql security invoker set search_path = '' as $$
  select * from private.listar_servicios_admin();
$$;
revoke all on function public.listar_servicios_admin() from public, anon;
grant execute on function public.listar_servicios_admin() to authenticated;

create function private.bloquear_servicio(p_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(87194531);
  update private.servicios set bloqueado = true where id = p_id;
  if not found then return 'no_disponible'; end if;
  return 'bloqueado';
end;
$$;
revoke all on function private.bloquear_servicio(uuid) from public, anon;
grant execute on function private.bloquear_servicio(uuid) to authenticated;
create function public.bloquear_servicio(p_id uuid)
returns text language sql security invoker set search_path = '' as $$ select private.bloquear_servicio(p_id); $$;
revoke all on function public.bloquear_servicio(uuid) from public, anon;
grant execute on function public.bloquear_servicio(uuid) to authenticated;

create function private.borrar_servicio(p_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(87194531);
  perform 1 from private.servicios s where s.id = p_id for update;
  if not found then return 'no_disponible'; end if;
  if exists (select 1 from public.citas c where c.servicio_id = p_id and c.inicio > clock_timestamp()
    and c.estado in ('pendiente', 'confirmada', 'propuesta')) then
    return 'tiene_citas';
  end if;
  delete from private.servicios where id = p_id;
  return 'borrado';
end;
$$;
revoke all on function private.borrar_servicio(uuid) from public, anon;
grant execute on function private.borrar_servicio(uuid) to authenticated;
create function public.borrar_servicio(p_id uuid)
returns text language sql security invoker set search_path = '' as $$ select private.borrar_servicio(p_id); $$;
revoke all on function public.borrar_servicio(uuid) from public, anon;
grant execute on function public.borrar_servicio(uuid) to authenticated;

create or replace function private.renombrar_servicio(p_id uuid, p_nombre text)
returns text language plpgsql security definer set search_path = '' as $$
declare momento timestamptz;
begin
  if not exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  if p_nombre is null or length(btrim(p_nombre)) = 0 then raise exception 'Se requiere un nombre' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(87194531);
  momento := clock_timestamp();
  perform 1 from private.servicios s where s.id = p_id for update;
  if not found then return 'no_disponible'; end if;
  begin
    update private.servicios set nombre = btrim(p_nombre) where id = p_id;
  exception when unique_violation then return 'nombre_existente';
  end;
  update public.citas set servicio = btrim(p_nombre) where servicio_id = p_id and inicio > momento;
  return 'actualizado';
end;
$$;

create or replace function private.validar_servicio_cita()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select s.id into new.servicio_id from private.servicios s
    where s.nombre = new.servicio and (not s.bloqueado or (select auth.uid()) is null);
  if (select auth.uid()) is not null and new.servicio_id is null then
    raise exception 'Servicio no disponible' using errcode = '23514';
  end if;
  return new;
end;
$$;
