create table private.preferencias_agenda_diaria (
  administrador_id uuid primary key references auth.users(id) on delete cascade,
  habilitada boolean not null default true
);
create table private.envios_agenda_diaria (
  administrador_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  reclamado_en timestamptz,
  enviado_en timestamptz,
  primary key (administrador_id, fecha)
);
revoke all on private.preferencias_agenda_diaria, private.envios_agenda_diaria from public, anon, authenticated;

create function public.preferencia_agenda_diaria(p_habilitada boolean default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare resultado boolean;
begin
  if not exists (select 1 from public.perfiles where id = auth.uid() and es_administrador) then
    raise exception 'Acceso denegado' using errcode = '42501';
  end if;
  if p_habilitada is not null then
    insert into private.preferencias_agenda_diaria (administrador_id, habilitada)
    values (auth.uid(), p_habilitada)
    on conflict (administrador_id) do update set habilitada = excluded.habilitada;
  end if;
  select coalesce((select habilitada from private.preferencias_agenda_diaria where administrador_id = auth.uid()), true) into resultado;
  return resultado;
end;
$$;
revoke all on function public.preferencia_agenda_diaria(boolean) from public, anon;
grant execute on function public.preferencia_agenda_diaria(boolean) to authenticated;

create function public.reclamar_agenda_diaria()
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
    on conflict on constraint envios_agenda_diaria_pkey do update set reclamado_en = excluded.reclamado_en
      where envio.enviado_en is null and (envio.reclamado_en is null or envio.reclamado_en < clock_timestamp() - interval '5 minutes')
    returning envio.administrador_id
  )
  select r.administrador_id, u.email::text, hoy, a.contenido from reclamados r
  join auth.users u on u.id = r.administrador_id cross join agenda a;
end;
$$;
revoke all on function public.reclamar_agenda_diaria() from public, anon, authenticated;
grant execute on function public.reclamar_agenda_diaria() to service_role;

create function public.finalizar_agenda_diaria(p_administrador uuid, p_fecha date, p_enviado boolean)
returns void language sql security definer set search_path = '' as $$
  update private.envios_agenda_diaria
  set enviado_en = case when p_enviado then clock_timestamp() else null end,
      reclamado_en = case when p_enviado then reclamado_en else null end
  where administrador_id = p_administrador and fecha = p_fecha and enviado_en is null;
$$;
revoke all on function public.finalizar_agenda_diaria(uuid, date, boolean) from public, anon, authenticated;
grant execute on function public.finalizar_agenda_diaria(uuid, date, boolean) to service_role;

create extension if not exists pg_net with schema extensions;
select cron.schedule(
  'enviar-agenda-diaria',
  '*/5 * * * *',
  $cron$
    select net.http_get(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'agenda_diaria_url'),
      headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'agenda_diaria_cron_secret'))
    )
    where extract(hour from clock_timestamp() at time zone 'America/Montevideo') = 6
      and exists (select 1 from vault.decrypted_secrets where name = 'agenda_diaria_url')
      and exists (select 1 from vault.decrypted_secrets where name = 'agenda_diaria_cron_secret');
  $cron$
);
