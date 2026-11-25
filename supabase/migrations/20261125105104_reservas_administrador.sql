create table private.citas_invitados (
  cita_id uuid primary key references public.citas(id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) > 0),
  apellido text,
  email text,
  telefono text
);
revoke all on private.citas_invitados from public, anon, authenticated;

create function private.reservar_cita_administrador(p_inicio timestamptz, p_servicio text, p_cliente_id uuid, p_nombre text, p_apellido text, p_email text, p_telefono text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare nueva_id uuid; nombre_destino text; email_destino text;
begin
  if not exists (select 1 from public.perfiles where id = auth.uid() and es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  if p_cliente_id is not null then
    select p.nombre, u.email into nombre_destino, email_destino from public.perfiles p
      join auth.users u on u.id = p.id where p.id = p_cliente_id and not p.es_administrador;
    if not found then raise exception 'Cliente inválido' using errcode = '22023'; end if;
  else
    if nullif(btrim(p_nombre), '') is null then raise exception 'Nombre obligatorio' using errcode = '22023'; end if;
    nombre_destino := concat_ws(' ', btrim(p_nombre), nullif(btrim(p_apellido), ''));
    email_destino := nullif(btrim(p_email), '');
  end if;
  perform pg_catalog.pg_advisory_xact_lock(87194531);
  if p_inicio is null or p_inicio <= clock_timestamp() or timezone('America/Montevideo', p_inicio) > timezone('America/Montevideo', now()) + interval '3 months'
    or not private.inicio_disponible(p_inicio) then raise exception 'Horario no disponible' using errcode = '23514'; end if;
  insert into public.citas (cliente_id, inicio, servicio, estado) values (p_cliente_id, p_inicio, p_servicio, 'confirmada') returning id into nueva_id;
  if p_cliente_id is null then
    insert into private.citas_invitados values (nueva_id, btrim(p_nombre), nullif(btrim(p_apellido), ''), email_destino, nullif(btrim(p_telefono), ''));
  end if;
  if email_destino is not null then
    begin
      insert into private.eventos_email_citas (cita_id, actor_id, tipo, destinatario, inicio, servicio, nombre)
        values (nueva_id, auth.uid(), 'confirmacion', email_destino, p_inicio, p_servicio, nombre_destino);
    exception when others then raise warning 'No se pudo registrar el email de confirmación'; end;
  end if;
  return nueva_id;
end;
$$;

create function private.invitados_agenda() returns table (cita_id uuid)
language sql stable security definer set search_path = '' as $$
  select i.cita_id from private.citas_invitados i join public.citas c on c.id = i.cita_id
  where c.inicio > now() and exists (select 1 from public.perfiles p where p.id = auth.uid() and p.es_administrador);
$$;
revoke all on function private.invitados_agenda() from public, anon;
grant execute on function private.invitados_agenda() to authenticated;
create function public.invitados_agenda() returns table (cita_id uuid)
language sql stable security invoker set search_path = '' as $$ select * from private.invitados_agenda(); $$;
revoke all on function public.invitados_agenda() from public, anon;
grant execute on function public.invitados_agenda() to authenticated;
revoke all on function private.reservar_cita_administrador(timestamptz,text,uuid,text,text,text,text) from public, anon;
grant execute on function private.reservar_cita_administrador(timestamptz,text,uuid,text,text,text,text) to authenticated;
create function public.reservar_cita_administrador(p_inicio timestamptz, p_servicio text, p_cliente_id uuid, p_nombre text, p_apellido text, p_email text, p_telefono text)
returns uuid language sql security invoker set search_path = '' as $$
  select private.reservar_cita_administrador(p_inicio,p_servicio,p_cliente_id,p_nombre,p_apellido,p_email,p_telefono);
$$;
revoke all on function public.reservar_cita_administrador(timestamptz,text,uuid,text,text,text,text) from public, anon;
grant execute on function public.reservar_cita_administrador(timestamptz,text,uuid,text,text,text,text) to authenticated;

create or replace function private.agenda_administrador()
returns table (id uuid, inicio timestamptz, servicio text, estado text, nombre text, email text, telefono text, sexo text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.inicio, c.servicio, c.estado, coalesce(p.nombre, concat_ws(' ', i.nombre, i.apellido)), coalesce(u.email::text, i.email), coalesce(p.telefono, i.telefono), p.sexo
  from public.citas c left join public.perfiles p on p.id = c.cliente_id left join auth.users u on u.id = c.cliente_id
  left join private.citas_invitados i on i.cita_id = c.id
  where exists (select 1 from public.perfiles a where a.id = auth.uid() and a.es_administrador)
    and (p.id is not null or i.cita_id is not null) and c.inicio > now()
    and (c.estado in ('confirmada', 'propuesta') or (c.estado = 'pendiente' and c.inicio > now() + private.plazo_reserva()))
  order by c.inicio, c.id;
$$;

create or replace function public.reclamar_agenda_diaria()
returns table (administrador_id uuid, destinatario text, fecha date, filas jsonb)
language plpgsql security definer set search_path = '' as $$
declare hoy date := (clock_timestamp() at time zone 'America/Montevideo')::date;
begin
  return query
  with horarios as (
    select d.hora,
      case when c.id is not null then c.estado when exists (
        select 1 from private.bloqueos b where b.fecha = hoy and d.hora >= b.hora_inicio and d.hora < b.hora_fin
      ) then 'bloqueado' else 'libre' end as estado,
      coalesce(p.nombre, nullif(concat_ws(' ', i.nombre, i.apellido), '')) as nombre, c.servicio
    from private.disponibilidad_semanal d
    left join public.citas c on (c.inicio at time zone 'America/Montevideo')::date = hoy
      and extract(hour from c.inicio at time zone 'America/Montevideo') = d.hora
      and c.estado in ('confirmada', 'pendiente', 'propuesta')
    left join public.perfiles p on p.id = c.cliente_id
    left join private.citas_invitados i on i.cita_id = c.id
    where d.dia = extract(isodow from hoy)
  ), agenda as (
    select jsonb_agg(jsonb_build_object('hora', hora, 'estado', estado, 'nombre', nombre, 'servicio', servicio) order by hora) as contenido
    from horarios
  ), reclamados as (
    insert into private.envios_agenda_diaria as envio (administrador_id, fecha, reclamado_en)
    select p.id, hoy, clock_timestamp() from public.perfiles p
    join auth.users u on u.id = p.id and u.email is not null
    left join private.preferencias_agenda_diaria pref on pref.administrador_id = p.id
    cross join agenda a
    where p.es_administrador and coalesce(pref.habilitada, true) and a.contenido is not null
      and (clock_timestamp() at time zone 'America/Montevideo')::time >= coalesce(pref.hora, time '06:00')
    on conflict on constraint envios_agenda_diaria_pkey do update set reclamado_en = excluded.reclamado_en
      where envio.enviado_en is null and (envio.reclamado_en is null or envio.reclamado_en < clock_timestamp() - interval '5 minutes')
    returning envio.administrador_id
  )
  select r.administrador_id, u.email::text, hoy, a.contenido from reclamados r
  join auth.users u on u.id = r.administrador_id cross join agenda a;
end;
$$;

create or replace function private.registrar_email_cita() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  tipo_evento text;
  actor uuid := (select auth.uid());
  nombre_cliente text;
  email_cliente text;
begin
  if actor is null then return new; end if;
  if tg_op = 'INSERT' and new.estado = 'pendiente' and actor = new.cliente_id then
    tipo_evento := 'solicitud_cliente';
  elsif tg_op = 'UPDATE' and exists (select 1 from public.perfiles where id = actor and es_administrador) then
    if old.estado = 'pendiente' and new.estado = 'confirmada' then tipo_evento := 'confirmacion';
    elsif old.estado = 'pendiente' and new.estado = 'propuesta' then tipo_evento := 'propuesta';
    elsif old.estado = 'confirmada' and new.estado = 'cancelada' and new.motivo_cancelacion is not null then tipo_evento := 'cancelacion';
    end if;
  end if;
  if tipo_evento is null then return new; end if;
  begin
    select p.nombre, u.email into nombre_cliente, email_cliente from public.perfiles p join auth.users u on u.id = p.id where p.id = new.cliente_id;
    if new.cliente_id is null then
      select concat_ws(' ', i.nombre, i.apellido), i.email into nombre_cliente, email_cliente from private.citas_invitados i where i.cita_id = new.id;
    end if;
    if email_cliente is not null then
      insert into private.eventos_email_citas (cita_id, actor_id, tipo, destinatario, inicio, servicio, nombre, motivo)
      values (new.id, actor, tipo_evento, email_cliente, new.inicio, new.servicio, coalesce(nombre_cliente, ''), new.motivo_cancelacion);
    end if;
    if tipo_evento = 'solicitud_cliente' then
      insert into private.eventos_email_citas (cita_id, actor_id, tipo, destinatario, inicio, servicio, nombre)
      select new.id, actor, 'solicitud_admin', a.email, new.inicio, new.servicio, coalesce(nombre_cliente, '') from private.emails_administradores() a
      where not exists (
        select 1 from auth.users u
        join private.preferencias_agenda_diaria p on p.administrador_id = u.id
        where u.email = a.email and not p.solicitudes_habilitadas
      );
    end if;
  exception when others then
    raise warning 'No se pudieron registrar los emails de la cita';
  end;
  return new;
end;
$$;

