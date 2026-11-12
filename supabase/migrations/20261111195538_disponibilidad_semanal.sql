create table private.disponibilidad_semanal (
  dia integer not null check (dia between 1 and 7),
  hora integer not null check (hora between 0 and 23),
  primary key (dia, hora)
);
insert into private.disponibilidad_semanal (dia, hora)
select dia, hora from generate_series(1, 5) dia cross join generate_series(7, 18) hora;
revoke all on private.disponibilidad_semanal from public, anon, authenticated;

create function private.disponibilidad_semanal_actual()
returns table (dia integer, hora integer) language sql stable security definer set search_path = '' as $$
  select d.dia, d.hora from private.disponibilidad_semanal d order by d.dia, d.hora;
$$;
revoke all on function private.disponibilidad_semanal_actual() from public, anon;
grant execute on function private.disponibilidad_semanal_actual() to authenticated;
create function public.disponibilidad_semanal()
returns table (dia integer, hora integer) language sql stable security invoker set search_path = '' as $$
  select * from private.disponibilidad_semanal_actual();
$$;
revoke all on function public.disponibilidad_semanal() from public, anon;
grant execute on function public.disponibilidad_semanal() to authenticated;

create function private.inicio_disponible(p_inicio timestamptz)
returns boolean language sql stable security definer set search_path = '' as $$
  select date_trunc('hour', timezone('America/Montevideo', p_inicio)) = timezone('America/Montevideo', p_inicio)
    and exists (select 1 from private.disponibilidad_semanal d
      where d.dia = extract(isodow from timezone('America/Montevideo', p_inicio))
        and d.hora = extract(hour from timezone('America/Montevideo', p_inicio)));
$$;
revoke all on function private.inicio_disponible(timestamptz) from public, anon;
grant execute on function private.inicio_disponible(timestamptz) to authenticated;

drop policy "Clientes solicitan citas" on public.citas;
create policy "Clientes solicitan citas" on public.citas for insert to authenticated
with check ((select auth.uid()) = cliente_id
  and inicio >= clock_timestamp() + interval '24 hours'
  and timezone('America/Montevideo', inicio) <= timezone('America/Montevideo', now()) + interval '3 months'
  and private.inicio_disponible(inicio));

create function private.validar_disponibilidad_cita()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(87194531);
  if (select auth.uid()) is not null and not private.inicio_disponible(new.inicio) then
    raise exception 'Horario no disponible' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validar_disponibilidad_cita() from public, anon, authenticated;
create trigger validar_disponibilidad_cita before insert or update of inicio on public.citas
for each row execute function private.validar_disponibilidad_cita();

create function private.guardar_disponibilidad_semanal(p_horarios jsonb, p_confirmar boolean default false, p_citas uuid[] default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare afectadas uuid[]; item jsonb; momento timestamptz;
begin
  if not exists (select 1 from public.perfiles where id = (select auth.uid()) and es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  if p_horarios is null or jsonb_typeof(p_horarios) <> 'array' or jsonb_array_length(p_horarios) > 168 then
    raise exception 'Disponibilidad inválida' using errcode = '22023';
  end if;
  for item in select * from jsonb_array_elements(p_horarios) loop
    if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'dia') <> 'number' or jsonb_typeof(item->'hora') <> 'number'
      or (item->>'dia') !~ '^[1-7]$' or (item->>'hora') !~ '^([0-9]|1[0-9]|2[0-3])$' then
      raise exception 'Disponibilidad inválida' using errcode = '22023';
    end if;
  end loop;
  if (select count(*) from jsonb_array_elements(p_horarios)) <>
     (select count(distinct (x->>'dia', x->>'hora')) from jsonb_array_elements(p_horarios) x) then
    raise exception 'Disponibilidad duplicada' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(87194531);
  momento := clock_timestamp();
  select coalesce(array_agg(c.id order by c.id), '{}'::uuid[]) into afectadas
  from public.citas c where c.inicio > momento and c.estado in ('pendiente', 'confirmada', 'propuesta')
    and not exists (select 1 from jsonb_array_elements(p_horarios) h
      where (h->>'dia')::integer = extract(isodow from timezone('America/Montevideo', c.inicio))
        and (h->>'hora')::integer = extract(hour from timezone('America/Montevideo', c.inicio)));
  if exists (select 1 from public.citas c where c.id = any(afectadas) and c.inicio <= momento + interval '24 hours') then
    return jsonb_build_object('resultado', 'dentro_del_plazo');
  end if;
  if cardinality(afectadas) > 0 and (not coalesce(p_confirmar, false) or p_citas is distinct from afectadas) then
    return jsonb_build_object('resultado', 'confirmacion', 'citas', to_jsonb(afectadas), 'cantidad', cardinality(afectadas));
  end if;
  update public.citas set estado = 'cancelada' where id = any(afectadas) and estado in ('pendiente', 'confirmada', 'propuesta');
  delete from private.disponibilidad_semanal;
  insert into private.disponibilidad_semanal (dia, hora)
    select (h->>'dia')::integer, (h->>'hora')::integer from jsonb_array_elements(p_horarios) h;
  return jsonb_build_object('resultado', 'guardada');
end;
$$;
revoke all on function private.guardar_disponibilidad_semanal(jsonb, boolean, uuid[]) from public, anon;
grant execute on function private.guardar_disponibilidad_semanal(jsonb, boolean, uuid[]) to authenticated;
create function public.guardar_disponibilidad_semanal(p_horarios jsonb, p_confirmar boolean default false, p_citas uuid[] default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.guardar_disponibilidad_semanal(p_horarios, p_confirmar, p_citas);
$$;
revoke all on function public.guardar_disponibilidad_semanal(jsonb, boolean, uuid[]) from public, anon;
grant execute on function public.guardar_disponibilidad_semanal(jsonb, boolean, uuid[]) to authenticated;
alter function private.inicio_disponible(timestamptz) volatile;

create or replace function private.proponer_horario_administrador(p_cita_id uuid, p_nuevo_inicio timestamptz)
returns text language plpgsql security definer set search_path = '' as $$
declare cita public.citas%rowtype; inicio_local timestamp;
begin
  if not exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(87194531);
  select c.* into cita from public.citas c where c.id = p_cita_id for update;
  if not found or cita.estado <> 'pendiente' then return 'no_pendiente'; end if;
  if cita.inicio <= clock_timestamp() + interval '24 hours' then
    update public.citas set estado = 'cancelada' where id = p_cita_id;
    return 'cancelada';
  end if;
  if p_nuevo_inicio is null or p_nuevo_inicio = cita.inicio then return 'horario_invalido'; end if;
  inicio_local := timezone('America/Montevideo', p_nuevo_inicio);
  if p_nuevo_inicio < clock_timestamp() + interval '24 hours'
    or inicio_local > timezone('America/Montevideo', now()) + interval '3 months'
    or not private.inicio_disponible(p_nuevo_inicio) then return 'horario_invalido'; end if;
  begin
    update public.citas set inicio = p_nuevo_inicio, estado = 'propuesta' where id = p_cita_id;
    return 'propuesta';
  exception when unique_violation then return 'horario_no_disponible';
  end;
end;
$$;
