create function private.telefono_whatsapp_valido(p_telefono text)
returns boolean language sql immutable security definer set search_path = '' as $$
  with datos as (
    select trim(p_telefono) as texto, regexp_replace(trim(p_telefono), '[^0-9]', '', 'g') as digitos
  ), normalizado as (
    select case
      when texto !~ '^[+0-9[:space:]().-]+$' then null
      when digitos ~ '^09[0-9]{7}$' then '598' || substr(digitos, 2)
      when digitos like '00%' then substr(digitos, 3)
      when texto not like '+%' and digitos not like '598%' then null
      else digitos end as numero
    from datos
  )
  select coalesce((case when numero ~ '^59809[0-9]{7}$' then '598' || substr(numero, 5) else numero end) ~ '^[1-9][0-9]{7,14}$', false)
  from normalizado;
$$;
revoke all on function private.telefono_whatsapp_valido(text) from public, anon;
grant execute on function private.telefono_whatsapp_valido(text) to authenticated, service_role;

create table public.contacto_config (
  id boolean primary key default true check (id),
  telefono text not null check (length(trim(telefono)) between 1 and 100 and private.telefono_whatsapp_valido(telefono)),
  direccion text not null check (length(trim(direccion)) between 1 and 300),
  titular_cuenta text not null check (length(trim(titular_cuenta)) between 1 and 150),
  cuenta_bancaria text not null check (length(trim(cuenta_bancaria)) between 1 and 300)
);
insert into public.contacto_config (telefono, direccion, titular_cuenta, cuenta_bancaria)
values ('094 553 211', 'Isla de Gaspar 2445, Montevideo, Uruguay', 'José Luis', 'BANCO REPUBLICA $ 00040248300001');
alter table public.contacto_config enable row level security;
revoke all on public.contacto_config from anon, authenticated;
grant select, update (telefono, direccion, titular_cuenta, cuenta_bancaria) on public.contacto_config to authenticated;
create policy contacto_lectura on public.contacto_config for select to authenticated using (
  exists (select 1 from public.perfiles p where p.id = (select auth.uid())
    and (p.es_administrador or (length(trim(p.nombre)) > 0 and length(trim(p.telefono)) > 0
      and p.sexo in ('Hombre', 'Mujer', 'Prefiero no especificar'))))
);
create policy contacto_admin_update on public.contacto_config for update to authenticated
  using (exists (select 1 from public.perfiles where id = (select auth.uid()) and es_administrador))
  with check (exists (select 1 from public.perfiles where id = (select auth.uid()) and es_administrador));
