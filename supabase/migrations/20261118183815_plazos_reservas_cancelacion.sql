-- Booking and pending proposal expiry: 4 hours. Client cancellation: 12 hours.

drop policy "Clientes solicitan citas" on public.citas;
create policy "Clientes solicitan citas" on public.citas for insert to authenticated
with check ((select auth.uid()) = cliente_id
  and inicio >= clock_timestamp() + interval '4 hours'
  and timezone('America/Montevideo', inicio) <= timezone('America/Montevideo', now()) + interval '3 months'
  and private.inicio_disponible(inicio));

create or replace function private.expirar_solicitudes_pendientes()
returns integer language plpgsql security definer set search_path = '' as $$
declare cantidad integer;
begin
  update public.citas set estado = 'cancelada'
  where estado in ('pendiente', 'propuesta') and inicio <= now() + interval '4 hours';
  get diagnostics cantidad = row_count;
  return cantidad;
end;
$$;

create or replace function private.expirar_solicitud_vencida_antes_de_reservar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.citas set estado = 'cancelada'
  where inicio = new.inicio and estado in ('pendiente', 'propuesta')
    and inicio <= now() + interval '4 hours';
  return new;
end;
$$;

create or replace function private.horarios_ocupados(desde timestamptz, hasta timestamptz)
returns table (inicio timestamptz) language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.exigir_perfil_completo();
  return query select c.inicio from public.citas c
    where (select auth.uid()) is not null and c.inicio >= desde and c.inicio < hasta
      and (c.estado = 'confirmada' or (c.estado in ('pendiente', 'propuesta') and c.inicio > now() + interval '4 hours'));
end;
$$;

create or replace function private.responder_propuesta(p_cita_id uuid, p_decision text)
returns text language plpgsql security definer set search_path = '' as $$
declare cita public.citas%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'Se requiere iniciar sesión' using errcode = '42501'; end if;
  if p_decision is null or p_decision not in ('aceptar', 'rechazar') then
    raise exception 'Decisión inválida' using errcode = '22023';
  end if;
  select c.* into cita from public.citas c
  where c.id = p_cita_id and c.cliente_id = (select auth.uid()) for update;
  if not found or cita.estado <> 'propuesta' then return 'no_vigente'; end if;
  if cita.inicio <= clock_timestamp() + interval '4 hours' or p_decision = 'rechazar' then
    update public.citas set estado = 'cancelada' where id = p_cita_id;
    return 'cancelada';
  end if;
  update public.citas set estado = 'confirmada' where id = p_cita_id;
  return 'confirmada';
end;
$$;

create or replace function private.resolver_solicitud_administrador(p_cita_id uuid, p_decision text)
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

  if cita.inicio <= clock_timestamp() + interval '4 hours' then
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

create or replace function private.agenda_administrador()
returns table (id uuid, inicio timestamptz, servicio text, estado text, nombre text, email text, telefono text, sexo text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.inicio, c.servicio, c.estado, p.nombre, u.email::text, p.telefono, p.sexo
  from public.citas c join public.perfiles p on p.id = c.cliente_id join auth.users u on u.id = c.cliente_id
  where exists (select 1 from public.perfiles a where a.id = (select auth.uid()) and a.es_administrador)
    and c.inicio > now()
    and (c.estado in ('confirmada', 'propuesta') or (c.estado = 'pendiente' and c.inicio > now() + interval '4 hours'))
  order by c.inicio, c.id;
$$;

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
  if cita.inicio <= clock_timestamp() + interval '4 hours' then
    update public.citas set estado = 'cancelada' where id = p_cita_id;
    return 'cancelada';
  end if;
  if p_nuevo_inicio is null or p_nuevo_inicio = cita.inicio then return 'horario_invalido'; end if;
  inicio_local := timezone('America/Montevideo', p_nuevo_inicio);
  if p_nuevo_inicio < clock_timestamp() + interval '4 hours'
    or inicio_local > timezone('America/Montevideo', now()) + interval '3 months'
    or not private.inicio_disponible(p_nuevo_inicio) then return 'horario_invalido'; end if;
  begin
    update public.citas set inicio = p_nuevo_inicio, estado = 'propuesta' where id = p_cita_id;
    return 'propuesta';
  exception when unique_violation then return 'horario_no_disponible';
  end;
end;
$$;

create or replace function private.cancelar_cita_cliente(p_cita_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare cita public.citas%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Se requiere iniciar sesión' using errcode = '42501';
  end if;
  select c.* into cita from public.citas c
  where c.id = p_cita_id and c.cliente_id = (select auth.uid()) for update;
  if not found or cita.estado not in ('pendiente', 'confirmada') then
    return 'no_disponible';
  end if;
  if cita.inicio <= clock_timestamp() + interval '12 hours' then
    return 'fuera_de_plazo';
  end if;
  update public.citas set estado = 'cancelada' where id = p_cita_id;
  return 'cancelada';
end;
$$;
