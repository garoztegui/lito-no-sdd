create or replace function private.proponer_horario_administrador(p_cita_id uuid, p_nuevo_inicio timestamptz)
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
  if cita.inicio <= now() + interval '24 hours' then
    update public.citas set estado = 'cancelada' where id = p_cita_id;
    return 'cancelada';
  end if;
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
