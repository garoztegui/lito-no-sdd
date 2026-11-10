create function public.proponer_horario_local(p_cita_id uuid, p_nuevo_inicio_local text)
returns text language sql security invoker set search_path = '' as $$
  select public.proponer_horario_administrador(
    p_cita_id, timezone('America/Montevideo', p_nuevo_inicio_local::timestamp)
  );
$$;
revoke all on function public.proponer_horario_local(uuid, text) from public, anon;
grant execute on function public.proponer_horario_local(uuid, text) to authenticated;

create or replace function private.agenda_administrador()
returns table (id uuid, inicio timestamptz, servicio text, estado text, nombre text, email text, telefono text, sexo text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.inicio, c.servicio, c.estado, p.nombre, u.email::text, p.telefono, p.sexo
  from public.citas c join public.perfiles p on p.id = c.cliente_id join auth.users u on u.id = c.cliente_id
  where exists (select 1 from public.perfiles a where a.id = (select auth.uid()) and a.es_administrador)
    and c.inicio > now()
    and (c.estado in ('confirmada', 'propuesta') or (c.estado = 'pendiente' and c.inicio > now() + interval '24 hours'))
  order by c.inicio, c.id;
$$;
