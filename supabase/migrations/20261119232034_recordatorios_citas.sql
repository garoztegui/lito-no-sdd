create table private.recordatorios_citas (
  cita_id uuid primary key references public.citas(id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  reclamado_en timestamptz,
  enviado_en timestamptz
);
revoke all on private.recordatorios_citas from public, anon, authenticated;

create function public.reclamar_recordatorios()
returns table (cita_id uuid, token uuid) language sql security definer set search_path = '' as $$
  insert into private.recordatorios_citas as recordatorio (cita_id, reclamado_en)
  select c.id, clock_timestamp() from public.citas c
  join auth.users u on u.id = c.cliente_id and u.email is not null
  left join private.recordatorios_citas previo on previo.cita_id = c.id
  where c.estado = 'confirmada' and c.inicio > clock_timestamp()
    and c.inicio <= clock_timestamp() + interval '3 hours'
    and (previo.cita_id is null or (previo.enviado_en is null
      and (previo.reclamado_en is null or previo.reclamado_en < clock_timestamp() - interval '5 minutes')))
  order by c.inicio, c.id limit 20
  on conflict on constraint recordatorios_citas_pkey do update set reclamado_en = excluded.reclamado_en, token = gen_random_uuid()
    where recordatorio.enviado_en is null
      and (recordatorio.reclamado_en is null or recordatorio.reclamado_en < clock_timestamp() - interval '5 minutes')
  returning recordatorio.cita_id, recordatorio.token;
$$;
revoke all on function public.reclamar_recordatorios() from public, anon, authenticated;
grant execute on function public.reclamar_recordatorios() to service_role;

create function public.datos_recordatorio(p_cita_id uuid, p_token uuid)
returns table (destinatario text, nombre text, inicio timestamptz, servicio text)
language sql stable security definer set search_path = '' as $$
  select u.email::text, p.nombre, c.inicio, c.servicio
  from public.citas c
  join auth.users u on u.id = c.cliente_id
  join public.perfiles p on p.id = c.cliente_id
  join private.recordatorios_citas r on r.cita_id = c.id
  where c.id = p_cita_id and c.estado = 'confirmada' and c.inicio > clock_timestamp()
    and r.enviado_en is null and r.reclamado_en is not null and r.token = p_token;
$$;
revoke all on function public.datos_recordatorio(uuid, uuid) from public, anon, authenticated;
grant execute on function public.datos_recordatorio(uuid, uuid) to service_role;

create function public.finalizar_recordatorio(p_cita_id uuid, p_token uuid, p_enviado boolean)
returns void language sql security definer set search_path = '' as $$
  update private.recordatorios_citas
  set enviado_en = case when p_enviado then clock_timestamp() else null end,
      reclamado_en = case when p_enviado then reclamado_en else null end
  where cita_id = p_cita_id and token = p_token and enviado_en is null;
$$;
revoke all on function public.finalizar_recordatorio(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.finalizar_recordatorio(uuid, uuid, boolean) to service_role;

select cron.schedule('enviar-recordatorios-citas', '* * * * *', $cron$
  select net.http_get(
    url := regexp_replace((select decrypted_secret from vault.decrypted_secrets where name = 'agenda_diaria_url'), '/api/agenda-diaria$', '/api/recordatorios'),
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'agenda_diaria_cron_secret')),
    timeout_milliseconds := 30000
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'agenda_diaria_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'agenda_diaria_cron_secret')
    and (select decrypted_secret from vault.decrypted_secrets where name = 'agenda_diaria_url') ~ '/api/agenda-diaria$';
$cron$);
