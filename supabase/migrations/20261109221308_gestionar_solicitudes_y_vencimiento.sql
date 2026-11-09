create extension if not exists pg_cron with schema pg_catalog;

alter table public.citas drop constraint citas_estado_check;
alter table public.citas add constraint citas_estado_check
  check (estado in ('pendiente', 'confirmada', 'rechazada', 'cancelada'));

alter table public.citas drop constraint citas_inicio_key;
create unique index citas_inicio_ocupada_key on public.citas (inicio)
  where estado in ('pendiente', 'confirmada');

create function private.expirar_solicitudes_pendientes()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  citas_canceladas integer;
begin
  update public.citas
  set estado = 'cancelada'
  where estado = 'pendiente'
    and inicio <= now() + interval '24 hours';

  get diagnostics citas_canceladas = row_count;
  return citas_canceladas;
end;
$$;
revoke all on function private.expirar_solicitudes_pendientes() from public, anon, authenticated;

create function private.resolver_solicitud_administrador(p_cita_id uuid, p_decision text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  cita public.citas%rowtype;
begin
  if not exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid()) and p.es_administrador
  ) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;

  if p_decision is null or p_decision not in ('aceptar', 'rechazar') then
    raise exception 'Decisión de solicitud inválida' using errcode = '22023';
  end if;

  select c.* into cita
  from public.citas c
  where c.id = p_cita_id
  for update;

  if not found or cita.estado <> 'pendiente' then
    return 'no_pendiente';
  end if;

  if cita.inicio <= now() + interval '24 hours' then
    update public.citas set estado = 'cancelada' where id = p_cita_id;
    return 'cancelada';
  end if;

  if p_decision = 'aceptar' then
    update public.citas set estado = 'confirmada' where id = p_cita_id;
    return 'confirmada';
  end if;

  update public.citas set estado = 'rechazada' where id = p_cita_id;
  return 'rechazada';
end;
$$;
revoke all on function private.resolver_solicitud_administrador(uuid, text) from public, anon;
grant execute on function private.resolver_solicitud_administrador(uuid, text) to authenticated;

create function public.resolver_solicitud_administrador(p_cita_id uuid, p_decision text)
returns text
language sql security invoker set search_path = '' as $$
  select private.resolver_solicitud_administrador(p_cita_id, p_decision);
$$;
revoke all on function public.resolver_solicitud_administrador(uuid, text) from public, anon;
grant execute on function public.resolver_solicitud_administrador(uuid, text) to authenticated;

drop function public.agenda_administrador();
drop function private.agenda_administrador();

create function private.agenda_administrador()
returns table (id uuid, inicio timestamptz, servicio text, estado text, nombre text, email text, telefono text, sexo text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.inicio, c.servicio, c.estado, p.nombre, u.email::text, p.telefono, p.sexo
  from public.citas c
  join public.perfiles p on p.id = c.cliente_id
  join auth.users u on u.id = c.cliente_id
  where exists (select 1 from public.perfiles a where a.id = (select auth.uid()) and a.es_administrador)
    and c.inicio > now()
    and (c.estado = 'confirmada' or (c.estado = 'pendiente' and c.inicio > now() + interval '24 hours'))
  order by c.inicio, c.id;
$$;
revoke all on function private.agenda_administrador() from public;
grant execute on function private.agenda_administrador() to authenticated;

create function public.agenda_administrador()
returns table (id uuid, inicio timestamptz, servicio text, estado text, nombre text, email text, telefono text, sexo text)
language sql stable security invoker set search_path = '' as $$
  select * from private.agenda_administrador();
$$;
revoke all on function public.agenda_administrador() from public;
grant execute on function public.agenda_administrador() to authenticated;

create or replace function private.horarios_ocupados(desde timestamptz, hasta timestamptz)
returns table (inicio timestamptz) language sql stable security definer set search_path = '' as $$
  select c.inicio from public.citas c
  where (select auth.uid()) is not null
    and c.inicio >= desde and c.inicio < hasta
    and (
      c.estado = 'confirmada'
      or (c.estado = 'pendiente' and c.inicio > now() + interval '24 hours')
    );
$$;

create function private.expirar_solicitud_vencida_antes_de_reservar()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.citas
  set estado = 'cancelada'
  where inicio = new.inicio
    and estado = 'pendiente'
    and inicio <= now() + interval '24 hours';

  return new;
end;
$$;
revoke all on function private.expirar_solicitud_vencida_antes_de_reservar() from public, anon, authenticated;

create trigger expirar_solicitud_vencida_antes_de_reservar
  before insert on public.citas
  for each row execute function private.expirar_solicitud_vencida_antes_de_reservar();

select cron.schedule(
  'cancelar-solicitudes-pendientes-vencidas',
  '* * * * *',
  'select private.expirar_solicitudes_pendientes();'
);
