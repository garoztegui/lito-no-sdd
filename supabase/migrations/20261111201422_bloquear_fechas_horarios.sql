create table private.bloqueos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  hora_inicio integer not null check (hora_inicio between 0 and 23),
  hora_fin integer not null check (hora_fin between 1 and 24 and hora_fin > hora_inicio)
);
revoke all on private.bloqueos from public, anon, authenticated;

create or replace function private.inicio_disponible(p_inicio timestamptz)
returns boolean language sql volatile security definer set search_path = '' as $$
  select date_trunc('hour', timezone('America/Montevideo', p_inicio)) = timezone('America/Montevideo', p_inicio)
    and exists (select 1 from private.disponibilidad_semanal d
      where d.dia = extract(isodow from timezone('America/Montevideo', p_inicio))
        and d.hora = extract(hour from timezone('America/Montevideo', p_inicio)))
    and not exists (select 1 from private.bloqueos b
      where b.fecha = timezone('America/Montevideo', p_inicio)::date
        and extract(hour from timezone('America/Montevideo', p_inicio)) >= b.hora_inicio
        and extract(hour from timezone('America/Montevideo', p_inicio)) < b.hora_fin);
$$;

create function private.horarios_bloqueados(p_fecha date)
returns table (hora integer) language sql stable security definer set search_path = '' as $$
  select distinct h from private.bloqueos b cross join lateral generate_series(b.hora_inicio, b.hora_fin - 1) h
  where b.fecha = p_fecha and (select auth.uid()) is not null order by h;
$$;
revoke all on function private.horarios_bloqueados(date) from public, anon;
grant execute on function private.horarios_bloqueados(date) to authenticated;
create function public.horarios_bloqueados(p_fecha date)
returns table (hora integer) language sql stable security invoker set search_path = '' as $$
  select * from private.horarios_bloqueados(p_fecha);
$$;
revoke all on function public.horarios_bloqueados(date) from public, anon;
grant execute on function public.horarios_bloqueados(date) to authenticated;

create function private.guardar_bloqueo(p_fecha date, p_hora_inicio integer, p_hora_fin integer, p_confirmar boolean default false, p_citas uuid[] default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare afectadas uuid[]; momento timestamptz; desde timestamptz; hasta timestamptz;
begin
  if not exists (select 1 from public.perfiles where id = (select auth.uid()) and es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  if p_fecha is null or not isfinite(p_fecha) or p_hora_inicio is null or p_hora_fin is null
    or p_hora_inicio not between 0 and 23 or p_hora_fin not between 1 and 24 or p_hora_fin <= p_hora_inicio then
    raise exception 'Bloqueo inválido' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(87194531);
  momento := clock_timestamp();
  desde := (p_fecha::timestamp + make_interval(hours => p_hora_inicio)) at time zone 'America/Montevideo';
  hasta := (p_fecha::timestamp + make_interval(hours => p_hora_fin)) at time zone 'America/Montevideo';
  if hasta <= momento then raise exception 'El bloqueo ya pasó' using errcode = '22023'; end if;
  select coalesce(array_agg(c.id order by c.id), '{}'::uuid[]) into afectadas
    from public.citas c where c.inicio > momento and c.inicio < hasta and c.inicio + interval '60 minutes' > desde
      and c.estado in ('pendiente', 'confirmada', 'propuesta');
  if exists (select 1 from public.citas c where c.id = any(afectadas) and c.inicio <= momento + interval '24 hours') then
    return jsonb_build_object('resultado', 'dentro_del_plazo');
  end if;
  if cardinality(afectadas) > 0 and (not coalesce(p_confirmar, false) or p_citas is distinct from afectadas) then
    return jsonb_build_object('resultado', 'confirmacion', 'citas', to_jsonb(afectadas), 'cantidad', cardinality(afectadas));
  end if;
  update public.citas set estado = 'cancelada' where id = any(afectadas) and estado in ('pendiente', 'confirmada', 'propuesta');
  insert into private.bloqueos (fecha, hora_inicio, hora_fin) values (p_fecha, p_hora_inicio, p_hora_fin);
  return jsonb_build_object('resultado', 'guardado');
end;
$$;
revoke all on function private.guardar_bloqueo(date, integer, integer, boolean, uuid[]) from public, anon;
grant execute on function private.guardar_bloqueo(date, integer, integer, boolean, uuid[]) to authenticated;
create function public.guardar_bloqueo(p_fecha date, p_hora_inicio integer, p_hora_fin integer, p_confirmar boolean default false, p_citas uuid[] default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.guardar_bloqueo(p_fecha, p_hora_inicio, p_hora_fin, p_confirmar, p_citas);
$$;
revoke all on function public.guardar_bloqueo(date, integer, integer, boolean, uuid[]) from public, anon;
grant execute on function public.guardar_bloqueo(date, integer, integer, boolean, uuid[]) to authenticated;

create function private.listar_bloqueos()
returns table (id uuid, fecha date, hora_inicio integer, hora_fin integer) language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  return query select b.id, b.fecha, b.hora_inicio, b.hora_fin from private.bloqueos b
    order by b.fecha, b.hora_inicio, b.id;
end;
$$;
revoke all on function private.listar_bloqueos() from public, anon;
grant execute on function private.listar_bloqueos() to authenticated;
create function public.listar_bloqueos()
returns table (id uuid, fecha date, hora_inicio integer, hora_fin integer) language sql security invoker set search_path = '' as $$
  select * from private.listar_bloqueos();
$$;
revoke all on function public.listar_bloqueos() from public, anon;
grant execute on function public.listar_bloqueos() to authenticated;

create function private.eliminar_bloqueo(p_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare bloqueo private.bloqueos%rowtype;
begin
  if not exists (select 1 from public.perfiles where id = (select auth.uid()) and es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(87194531);
  select b.* into bloqueo from private.bloqueos b where b.id = p_id for update;
  if not found then return 'no_disponible'; end if;
  if (bloqueo.fecha::timestamp + make_interval(hours => bloqueo.hora_fin)) at time zone 'America/Montevideo' <= clock_timestamp() then
    return 'pasado';
  end if;
  delete from private.bloqueos where id = p_id;
  return 'eliminado';
end;
$$;
revoke all on function private.eliminar_bloqueo(uuid) from public, anon;
grant execute on function private.eliminar_bloqueo(uuid) to authenticated;
create function public.eliminar_bloqueo(p_id uuid)
returns text language sql security invoker set search_path = '' as $$
  select private.eliminar_bloqueo(p_id);
$$;
revoke all on function public.eliminar_bloqueo(uuid) from public, anon;
grant execute on function public.eliminar_bloqueo(uuid) to authenticated;
