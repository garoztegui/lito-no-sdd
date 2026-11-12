create table private.servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique check (nombre = btrim(nombre) and length(nombre) > 0)
);
insert into private.servicios (nombre) values ('Masaje deportivo'), ('Cuerpo entero'), ('Espalda');
revoke all on private.servicios from public, anon, authenticated;

create function private.listar_servicios()
returns table (id uuid, nombre text) language sql stable security definer set search_path = '' as $$
  select s.id, s.nombre from private.servicios s order by s.nombre, s.id;
$$;
revoke all on function private.listar_servicios() from public, anon;
grant execute on function private.listar_servicios() to authenticated;
create function public.listar_servicios()
returns table (id uuid, nombre text) language sql stable security invoker set search_path = '' as $$
  select * from private.listar_servicios();
$$;
revoke all on function public.listar_servicios() from public, anon;
grant execute on function public.listar_servicios() to authenticated;

create function private.crear_servicio(p_nombre text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  if p_nombre is null or length(btrim(p_nombre)) = 0 then
    raise exception 'Se requiere un nombre' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(87194531);
  begin
    insert into private.servicios (nombre) values (btrim(p_nombre));
    return 'creado';
  exception when unique_violation then return 'nombre_existente';
  end;
end;
$$;
revoke all on function private.crear_servicio(text) from public, anon;
grant execute on function private.crear_servicio(text) to authenticated;
create function public.crear_servicio(p_nombre text)
returns text language sql security invoker set search_path = '' as $$ select private.crear_servicio(p_nombre); $$;
revoke all on function public.crear_servicio(text) from public, anon;
grant execute on function public.crear_servicio(text) to authenticated;

create function private.renombrar_servicio(p_id uuid, p_nombre text)
returns text language plpgsql security definer set search_path = '' as $$
declare anterior text; momento timestamptz;
begin
  if not exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  if p_nombre is null or length(btrim(p_nombre)) = 0 then
    raise exception 'Se requiere un nombre' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(87194531);
  momento := clock_timestamp();
  select s.nombre into anterior from private.servicios s where s.id = p_id for update;
  if not found then return 'no_disponible'; end if;
  begin
    update private.servicios set nombre = btrim(p_nombre) where id = p_id;
  exception when unique_violation then return 'nombre_existente';
  end;
  update public.citas set servicio = btrim(p_nombre) where servicio = anterior and inicio > momento;
  return 'actualizado';
end;
$$;
revoke all on function private.renombrar_servicio(uuid, text) from public, anon;
grant execute on function private.renombrar_servicio(uuid, text) to authenticated;
create function public.renombrar_servicio(p_id uuid, p_nombre text)
returns text language sql security invoker set search_path = '' as $$ select private.renombrar_servicio(p_id, p_nombre); $$;
revoke all on function public.renombrar_servicio(uuid, text) from public, anon;
grant execute on function public.renombrar_servicio(uuid, text) to authenticated;

alter table public.citas drop constraint citas_servicio_check;
create function private.validar_servicio_cita()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not exists (select 1 from private.servicios s where s.nombre = new.servicio) then
    raise exception 'Servicio no disponible' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validar_servicio_cita() from public, anon, authenticated;
create trigger z_validar_servicio_cita before insert on public.citas
for each row execute function private.validar_servicio_cita();
