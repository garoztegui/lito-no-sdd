alter table public.perfiles add column es_administrador boolean not null default false;

alter table public.citas drop constraint citas_estado_check;
alter table public.citas add constraint citas_estado_check check (estado in ('pendiente', 'confirmada'));

create function private.agenda_administrador()
returns table (inicio timestamptz, servicio text, estado text, nombre text, email text, telefono text, sexo text)
language sql stable security definer set search_path = '' as $$
  select c.inicio, c.servicio, c.estado, p.nombre, u.email::text, p.telefono, p.sexo
  from public.citas c
  join public.perfiles p on p.id = c.cliente_id
  join auth.users u on u.id = c.cliente_id
  where exists (select 1 from public.perfiles a where a.id = (select auth.uid()) and a.es_administrador)
    and c.inicio > now() and c.estado in ('pendiente', 'confirmada')
  order by c.inicio, c.id;
$$;
revoke all on function private.agenda_administrador() from public;
grant execute on function private.agenda_administrador() to authenticated;

create function public.agenda_administrador()
returns table (inicio timestamptz, servicio text, estado text, nombre text, email text, telefono text, sexo text)
language sql stable security invoker set search_path = '' as $$
  select * from private.agenda_administrador();
$$;
revoke all on function public.agenda_administrador() from public;
grant execute on function public.agenda_administrador() to authenticated;
