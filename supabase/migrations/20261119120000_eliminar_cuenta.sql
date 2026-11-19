alter table public.citas alter column cliente_id drop not null;
alter table public.citas add column nombre_cliente_historico text;

create function private.preparar_eliminacion_cliente()
returns trigger language plpgsql security definer set search_path = '' as $$
declare momento timestamptz; administrador boolean;
begin
  select p.es_administrador into administrador from public.perfiles p where p.id = old.id for update;
  if administrador then
    raise exception 'No se puede eliminar una cuenta administradora' using errcode = '42501';
  end if;
  if not found then
    return old;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(87194531);
  momento := clock_timestamp();
  delete from private.eventos_email_citas e
  where e.actor_id = old.id or e.destinatario = old.email
     or exists (select 1 from public.citas c where c.id = e.cita_id and c.cliente_id = old.id);
  delete from public.citas where cliente_id = old.id and inicio > momento;
  update public.citas set cliente_id = null, nombre_cliente_historico = 'USUARIO ELIMINADO', motivo_cancelacion = null
  where cliente_id = old.id;
  return old;
end;
$$;
revoke all on function private.preparar_eliminacion_cliente() from public, anon, authenticated;
create trigger preparar_eliminacion_cliente before delete on auth.users
for each row execute function private.preparar_eliminacion_cliente();

create function private.citas_usuarios_eliminados()
returns table (id uuid, inicio timestamptz, servicio text, estado text, nombre text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.perfiles p where p.id = auth.uid() and p.es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  return query select c.id, c.inicio, c.servicio, c.estado, c.nombre_cliente_historico
  from public.citas c where c.cliente_id is null and c.nombre_cliente_historico = 'USUARIO ELIMINADO'
  order by c.inicio desc, c.id desc;
end;
$$;
revoke all on function private.citas_usuarios_eliminados() from public, anon;
grant execute on function private.citas_usuarios_eliminados() to authenticated;
create function public.citas_usuarios_eliminados()
returns table (id uuid, inicio timestamptz, servicio text, estado text, nombre text)
language sql stable security invoker set search_path = '' as $$
  select * from private.citas_usuarios_eliminados();
$$;
revoke all on function public.citas_usuarios_eliminados() from public, anon;
grant execute on function public.citas_usuarios_eliminados() to authenticated;
