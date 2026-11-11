create or replace function private.expirar_solicitudes_pendientes()
returns integer language plpgsql security definer set search_path = '' as $$
declare cantidad integer;
begin
  update public.citas set estado = 'cancelada'
  where estado in ('pendiente', 'propuesta') and inicio <= now() + interval '24 hours';
  get diagnostics cantidad = row_count;
  return cantidad;
end;
$$;

create or replace function private.expirar_solicitud_vencida_antes_de_reservar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.citas set estado = 'cancelada'
  where inicio = new.inicio and estado in ('pendiente', 'propuesta')
    and inicio <= now() + interval '24 hours';
  return new;
end;
$$;

create or replace function private.horarios_ocupados(desde timestamptz, hasta timestamptz)
returns table (inicio timestamptz) language sql stable security definer set search_path = '' as $$
  select c.inicio from public.citas c
  where (select auth.uid()) is not null and c.inicio >= desde and c.inicio < hasta
    and (c.estado = 'confirmada' or (c.estado in ('pendiente', 'propuesta') and c.inicio > now() + interval '24 hours'));
$$;

create function private.responder_propuesta(p_cita_id uuid, p_decision text)
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
  if cita.inicio <= now() + interval '24 hours' or p_decision = 'rechazar' then
    update public.citas set estado = 'cancelada' where id = p_cita_id;
    return 'cancelada';
  end if;
  update public.citas set estado = 'confirmada' where id = p_cita_id;
  return 'confirmada';
end;
$$;
revoke all on function private.responder_propuesta(uuid, text) from public, anon;
grant execute on function private.responder_propuesta(uuid, text) to authenticated;

create function public.responder_propuesta(p_cita_id uuid, p_decision text)
returns text language sql security invoker set search_path = '' as $$
  select private.responder_propuesta(p_cita_id, p_decision);
$$;
revoke all on function public.responder_propuesta(uuid, text) from public, anon;
grant execute on function public.responder_propuesta(uuid, text) to authenticated;
