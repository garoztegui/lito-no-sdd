do $$
begin
  perform pg_catalog.pg_advisory_xact_lock(87194531);
  if exists (
    select 1 from public.citas c
    where c.inicio > clock_timestamp() and c.estado in ('pendiente', 'propuesta', 'confirmada')
      and (extract(month from timezone('America/Montevideo', c.inicio))::integer,
           extract(day from timezone('America/Montevideo', c.inicio))::integer)
          in ((1, 1), (5, 1), (7, 18), (8, 25), (12, 25))
  ) then
    raise exception 'Hay citas activas en los feriados';
  end if;
end;
$$;

create function private.es_feriado_no_laborable(p_fecha date)
returns boolean language sql immutable strict set search_path = '' as $$
  select (extract(month from p_fecha)::integer, extract(day from p_fecha)::integer)
    in ((1, 1), (5, 1), (7, 18), (8, 25), (12, 25));
$$;
revoke all on function private.es_feriado_no_laborable(date) from public, anon, authenticated;

create or replace function private.horarios_bloqueados(p_fecha date)
returns table (hora integer) language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.exigir_perfil_completo();
  if private.es_feriado_no_laborable(p_fecha) then
    return query select h from generate_series(0, 23) h;
  else
    return query select distinct h from private.bloqueos b cross join lateral generate_series(b.hora_inicio, b.hora_fin - 1) h
      where b.fecha = p_fecha and (select auth.uid()) is not null order by h;
  end if;
end;
$$;

create or replace function private.inicio_disponible(p_inicio timestamptz)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.exigir_perfil_completo();
  return not private.es_feriado_no_laborable(timezone('America/Montevideo', p_inicio)::date)
    and date_trunc('hour', timezone('America/Montevideo', p_inicio)) = timezone('America/Montevideo', p_inicio)
    and exists (select 1 from private.disponibilidad_semanal d
      where d.dia = extract(isodow from timezone('America/Montevideo', p_inicio))
        and d.hora = extract(hour from timezone('America/Montevideo', p_inicio)))
    and not exists (select 1 from private.bloqueos b
      where b.fecha = timezone('America/Montevideo', p_inicio)::date
        and extract(hour from timezone('America/Montevideo', p_inicio)) >= b.hora_inicio
        and extract(hour from timezone('America/Montevideo', p_inicio)) < b.hora_fin);
end;
$$;
