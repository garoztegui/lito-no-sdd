alter table public.citas drop constraint citas_estado_check;
alter table public.citas add constraint citas_estado_check
  check (estado in ('pendiente', 'confirmada', 'rechazada', 'cancelada', 'propuesta'));

drop index public.citas_inicio_ocupada_key;
create unique index citas_inicio_ocupada_key on public.citas (inicio)
  where estado in ('pendiente', 'confirmada', 'propuesta');

create function private.proponer_horario_administrador(p_cita_id uuid, p_nuevo_inicio timestamptz)
returns text language plpgsql security definer set search_path = '' as $$
declare
  cita public.citas%rowtype;
  inicio_local timestamp;
begin
  if not exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;

  select c.* into cita from public.citas c where c.id = p_cita_id for update;
  if not found or cita.estado <> 'pendiente' then return 'no_pendiente'; end if;
  if p_nuevo_inicio is null or p_nuevo_inicio = cita.inicio then return 'horario_invalido'; end if;

  inicio_local := timezone('America/Montevideo', p_nuevo_inicio);
  if p_nuevo_inicio < now() + interval '24 hours'
    or inicio_local > timezone('America/Montevideo', now()) + interval '3 months'
    or extract(isodow from inicio_local) not between 1 and 5
    or extract(hour from inicio_local) not between 7 and 18
    or date_trunc('hour', inicio_local) <> inicio_local then
    return 'horario_invalido';
  end if;

  begin
    update public.citas set inicio = p_nuevo_inicio, estado = 'propuesta' where id = p_cita_id;
    return 'propuesta';
  exception when unique_violation then
    return 'horario_no_disponible';
  end;
end;
$$;
revoke all on function private.proponer_horario_administrador(uuid, timestamptz) from public, anon;
grant execute on function private.proponer_horario_administrador(uuid, timestamptz) to authenticated;

create function public.proponer_horario_administrador(p_cita_id uuid, p_nuevo_inicio timestamptz)
returns text language sql security invoker set search_path = '' as $$
  select private.proponer_horario_administrador(p_cita_id, p_nuevo_inicio);
$$;
revoke all on function public.proponer_horario_administrador(uuid, timestamptz) from public, anon;
grant execute on function public.proponer_horario_administrador(uuid, timestamptz) to authenticated;

create or replace function private.horarios_ocupados(desde timestamptz, hasta timestamptz)
returns table (inicio timestamptz) language sql stable security definer set search_path = '' as $$
  select c.inicio from public.citas c
  where (select auth.uid()) is not null and c.inicio >= desde and c.inicio < hasta
    and (c.estado in ('confirmada', 'propuesta') or (c.estado = 'pendiente' and c.inicio > now() + interval '24 hours'));
$$;
