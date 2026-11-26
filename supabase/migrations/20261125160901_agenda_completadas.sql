create function private.agenda_completadas(p_mes date)
returns table (id uuid, inicio timestamptz, servicio text, nombre text, invitado boolean)
language sql stable security definer set search_path = '' as $$
  select c.id, c.inicio, c.servicio,
    coalesce(p.nombre, nullif(concat_ws(' ', i.nombre, i.apellido), ''), c.nombre_cliente_historico),
    i.cita_id is not null
  from public.citas c
  left join public.perfiles p on p.id = c.cliente_id
  left join private.citas_invitados i on i.cita_id = c.id
  where exists (select 1 from public.perfiles a where a.id = auth.uid() and a.es_administrador)
    and c.estado = 'confirmada' and c.inicio + interval '1 hour' <= now()
    and c.inicio >= (date_trunc('month', p_mes::timestamp) at time zone 'America/Montevideo')
    and c.inicio < ((date_trunc('month', p_mes::timestamp) + interval '1 month') at time zone 'America/Montevideo')
    and (p.id is not null or i.cita_id is not null or c.nombre_cliente_historico is not null)
  order by c.inicio, c.id;
$$;
revoke all on function private.agenda_completadas(date) from public, anon;
grant execute on function private.agenda_completadas(date) to authenticated;
create function public.agenda_completadas(p_mes date)
returns table (id uuid, inicio timestamptz, servicio text, nombre text, invitado boolean)
language sql stable security invoker set search_path = '' as $$
  select * from private.agenda_completadas(p_mes);
$$;
revoke all on function public.agenda_completadas(date) from public, anon;
grant execute on function public.agenda_completadas(date) to authenticated;
