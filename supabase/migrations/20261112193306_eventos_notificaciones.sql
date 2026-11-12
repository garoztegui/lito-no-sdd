create table private.eventos_email_citas (
  id uuid primary key default gen_random_uuid(),
  cita_id uuid not null references public.citas(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  tipo text not null,
  destinatario text not null,
  inicio timestamptz not null,
  servicio text not null,
  nombre text not null,
  motivo text,
  intentado boolean not null default false
);
revoke all on private.eventos_email_citas from public, anon, authenticated;

create function private.registrar_email_cita() returns trigger
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
      select new.id, actor, 'solicitud_admin', a.email, new.inicio, new.servicio, coalesce(nombre_cliente, '') from private.emails_administradores() a;
    end if;
  exception when others then
    raise warning 'No se pudieron registrar los emails de la cita';
  end;
  return new;
end;
$$;
revoke all on function private.registrar_email_cita() from public, anon, authenticated;
create trigger registrar_email_cita after insert or update on public.citas for each row execute function private.registrar_email_cita();

create function private.reclamar_emails_cita(p_cita_id uuid, p_inicio timestamptz, p_tipo text) returns setof uuid
language sql security definer set search_path = '' as $$
  update private.eventos_email_citas e set intentado = true
  where e.actor_id = (select auth.uid()) and not e.intentado
    and (p_cita_id is not null or p_inicio is not null)
    and (p_cita_id is null or e.cita_id = p_cita_id)
    and (p_inicio is null or e.inicio = p_inicio)
    and ((p_tipo = 'solicitud' and e.tipo in ('solicitud_cliente', 'solicitud_admin')) or e.tipo = p_tipo)
  returning e.id;
$$;
revoke all on function private.reclamar_emails_cita(uuid, timestamptz, text) from public, anon;
grant execute on function private.reclamar_emails_cita(uuid, timestamptz, text) to authenticated;
create function public.reclamar_emails_cita(p_cita_id uuid, p_inicio timestamptz, p_tipo text) returns setof uuid
language sql security invoker set search_path = '' as $$ select * from private.reclamar_emails_cita(p_cita_id, p_inicio, p_tipo); $$;
revoke all on function public.reclamar_emails_cita(uuid, timestamptz, text) from public, anon;
grant execute on function public.reclamar_emails_cita(uuid, timestamptz, text) to authenticated;

create function private.datos_email_cita(p_id uuid) returns table (tipo text, destinatario text, inicio timestamptz, servicio text, nombre text, motivo text)
language sql security definer set search_path = '' as $$
  select e.tipo, e.destinatario, e.inicio, e.servicio, e.nombre, e.motivo from private.eventos_email_citas e where e.id = p_id and e.intentado;
$$;
revoke all on function private.datos_email_cita(uuid) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.datos_email_cita(uuid) to service_role;
create function public.datos_email_cita(p_id uuid) returns table (tipo text, destinatario text, inicio timestamptz, servicio text, nombre text, motivo text)
language sql security invoker set search_path = '' as $$ select * from private.datos_email_cita(p_id); $$;
revoke all on function public.datos_email_cita(uuid) from public, anon, authenticated;
grant execute on function public.datos_email_cita(uuid) to service_role;
