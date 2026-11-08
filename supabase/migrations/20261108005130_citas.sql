create table public.citas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null default auth.uid() references auth.users(id),
  inicio timestamptz not null unique,
  servicio text not null check (servicio in ('Masaje deportivo', 'Cuerpo entero', 'Espalda')),
  estado text not null default 'pendiente' check (estado = 'pendiente')
);

alter table public.citas enable row level security;
grant select on public.citas to authenticated;
grant insert (inicio, servicio) on public.citas to authenticated;
create policy "Clientes consultan sus citas" on public.citas for select to authenticated
  using ((select auth.uid()) = cliente_id);
create policy "Clientes solicitan citas" on public.citas for insert to authenticated
  with check (
    (select auth.uid()) = cliente_id
    and inicio >= now() + interval '24 hours'
    and timezone('America/Montevideo', inicio) <= timezone('America/Montevideo', now()) + interval '3 months'
    and extract(isodow from timezone('America/Montevideo', inicio)) between 1 and 5
    and extract(hour from timezone('America/Montevideo', inicio)) between 7 and 18
    and date_trunc('hour', timezone('America/Montevideo', inicio)) = timezone('America/Montevideo', inicio)
  );

create function public.solicitar_cita(inicio_cita timestamptz, servicio_cita text)
returns void language sql security invoker set search_path = '' as $$
  insert into public.citas (inicio, servicio) values (inicio_cita, servicio_cita);
$$;
revoke all on function public.solicitar_cita(timestamptz, text) from public;
grant execute on function public.solicitar_cita(timestamptz, text) to authenticated;

create function private.horarios_ocupados(desde timestamptz, hasta timestamptz)
returns table (inicio timestamptz) language sql stable security definer set search_path = '' as $$
  select c.inicio from public.citas c
  where (select auth.uid()) is not null and c.inicio >= desde and c.inicio < hasta;
$$;
revoke all on function private.horarios_ocupados(timestamptz, timestamptz) from public;
grant usage on schema private to authenticated;
grant execute on function private.horarios_ocupados(timestamptz, timestamptz) to authenticated;

create function public.horarios_ocupados(desde timestamptz, hasta timestamptz)
returns table (inicio timestamptz) language sql stable security invoker set search_path = '' as $$
  select * from private.horarios_ocupados(desde, hasta);
$$;
revoke all on function public.horarios_ocupados(timestamptz, timestamptz) from public;
grant execute on function public.horarios_ocupados(timestamptz, timestamptz) to authenticated;
