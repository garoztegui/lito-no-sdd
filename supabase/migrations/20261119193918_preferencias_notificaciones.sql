alter table private.preferencias_agenda_diaria
  add column hora time not null default '06:00',
  add column solicitudes_habilitadas boolean not null default true,
  add constraint hora_agenda_minutos check (hora < time '24:00' and date_part('second', hora) = 0);

create function public.preferencias_notificaciones(
  p_agenda_habilitada boolean default null,
  p_hora_agenda time default null,
  p_solicitudes_habilitadas boolean default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare resultado jsonb;
begin
  if not exists (select 1 from public.perfiles where id = auth.uid() and es_administrador) then
    raise exception 'Acceso denegado' using errcode = '42501';
  end if;
  if p_agenda_habilitada is not null or p_hora_agenda is not null or p_solicitudes_habilitadas is not null then
    if p_agenda_habilitada is null or p_hora_agenda is null or p_solicitudes_habilitadas is null then
      raise exception 'Todas las preferencias son obligatorias' using errcode = '22023';
    end if;
    insert into private.preferencias_agenda_diaria (administrador_id, habilitada, hora, solicitudes_habilitadas)
    values (auth.uid(), p_agenda_habilitada, p_hora_agenda, p_solicitudes_habilitadas)
    on conflict (administrador_id) do update set habilitada = excluded.habilitada,
      hora = excluded.hora, solicitudes_habilitadas = excluded.solicitudes_habilitadas;
  end if;
  select jsonb_build_object('agenda_habilitada', coalesce(p.habilitada, true),
    'hora_agenda', to_char(coalesce(p.hora, time '06:00'), 'HH24:MI'),
    'solicitudes_habilitadas', coalesce(p.solicitudes_habilitadas, true)) into resultado
  from (select auth.uid() as id) actual
  left join private.preferencias_agenda_diaria p on p.administrador_id = actual.id;
  return resultado;
end;
$$;
revoke all on function public.preferencias_notificaciones(boolean, time, boolean) from public, anon;
grant execute on function public.preferencias_notificaciones(boolean, time, boolean) to authenticated;

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
      p.nombre, c.servicio
    from private.disponibilidad_semanal d
    left join public.citas c on (c.inicio at time zone 'America/Montevideo')::date = hoy
      and extract(hour from c.inicio at time zone 'America/Montevideo') = d.hora
      and c.estado in ('confirmada', 'pendiente', 'propuesta')
    left join public.perfiles p on p.id = c.cliente_id
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

select cron.schedule(
  'enviar-agenda-diaria', '* * * * *',
  $cron$
    select net.http_get(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'agenda_diaria_url'),
      headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'agenda_diaria_cron_secret'))
    )
    where exists (select 1 from vault.decrypted_secrets where name = 'agenda_diaria_url')
      and exists (select 1 from vault.decrypted_secrets where name = 'agenda_diaria_cron_secret');
  $cron$
);
