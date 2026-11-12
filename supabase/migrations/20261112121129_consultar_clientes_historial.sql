create index citas_cliente_inicio_id_idx on public.citas (cliente_id, inicio desc, id desc);

create function private.clientes_administrador(p_cliente_id uuid default null)
returns table (id uuid, nombre text, email text, telefono text, sexo text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.perfiles a where a.id = (select auth.uid()) and a.es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  return query select p.id, p.nombre, u.email::text, p.telefono, p.sexo
    from public.perfiles p join auth.users u on u.id = p.id
    where p_cliente_id is null or p.id = p_cliente_id
    order by p.nombre, p.id;
end;
$$;
revoke all on function private.clientes_administrador(uuid) from public, anon;
grant execute on function private.clientes_administrador(uuid) to authenticated;
create function public.clientes_administrador(p_cliente_id uuid default null)
returns table (id uuid, nombre text, email text, telefono text, sexo text)
language sql stable security invoker set search_path = '' as $$
  select * from private.clientes_administrador(p_cliente_id);
$$;
revoke all on function public.clientes_administrador(uuid) from public, anon;
grant execute on function public.clientes_administrador(uuid) to authenticated;

create function private.historial_cliente_administrador(p_cliente_id uuid)
returns table (id uuid, inicio timestamptz, servicio text, estado text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.perfiles a where a.id = (select auth.uid()) and a.es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  return query select c.id, c.inicio, c.servicio, c.estado
    from public.citas c where c.cliente_id = p_cliente_id
    order by c.inicio desc, c.id desc;
end;
$$;
revoke all on function private.historial_cliente_administrador(uuid) from public, anon;
grant execute on function private.historial_cliente_administrador(uuid) to authenticated;
create function public.historial_cliente_administrador(p_cliente_id uuid)
returns table (id uuid, inicio timestamptz, servicio text, estado text)
language sql stable security invoker set search_path = '' as $$
  select * from private.historial_cliente_administrador(p_cliente_id);
$$;
revoke all on function public.historial_cliente_administrador(uuid) from public, anon;
grant execute on function public.historial_cliente_administrador(uuid) to authenticated;
