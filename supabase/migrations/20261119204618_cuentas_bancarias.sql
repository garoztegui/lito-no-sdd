create table public.cuentas_bancarias (
  id bigint generated always as identity primary key,
  entidad text not null check (length(trim(entidad)) between 1 and 150),
  titular text not null check (length(trim(titular)) between 1 and 150),
  moneda text not null check (moneda in ('Pesos', 'Dólares', 'Pesos y dólares')),
  numero text not null check (length(trim(numero)) between 1 and 300)
);

-- The previous format combines the institution, peso symbol and account number.
-- Refuse ambiguous data rather than silently guessing or discarding it.
do $$
begin
  if exists (select 1 from public.contacto_config where cuenta_bancaria !~ '^.+[[:space:]]+\$[[:space:]]*[^[:space:]].*$') then
    raise exception 'No se puede separar la entidad y el número de la cuenta bancaria existente';
  end if;
end;
$$;
insert into public.cuentas_bancarias (entidad, titular, moneda, numero)
select trim(split_part(cuenta_bancaria, '$', 1)), titular_cuenta, 'Pesos', trim(substr(cuenta_bancaria, strpos(cuenta_bancaria, '$') + 1))
from public.contacto_config;

alter table public.cuentas_bancarias enable row level security;
revoke all on public.cuentas_bancarias from public, anon, authenticated;
grant select, insert, update, delete on public.cuentas_bancarias to authenticated;
grant usage, select on sequence public.cuentas_bancarias_id_seq to authenticated;
create policy cuentas_lectura on public.cuentas_bancarias for select to authenticated using (
  exists (select 1 from public.perfiles p where p.id = (select auth.uid())
    and (p.es_administrador or (length(trim(p.nombre)) > 0 and length(trim(p.telefono)) > 0
      and p.sexo in ('Hombre', 'Mujer', 'Prefiero no especificar'))))
);
create policy cuentas_admin_insert on public.cuentas_bancarias for insert to authenticated
  with check (exists (select 1 from public.perfiles where id = (select auth.uid()) and es_administrador));
create policy cuentas_admin_update on public.cuentas_bancarias for update to authenticated
  using (exists (select 1 from public.perfiles where id = (select auth.uid()) and es_administrador))
  with check (exists (select 1 from public.perfiles where id = (select auth.uid()) and es_administrador));
create policy cuentas_admin_delete on public.cuentas_bancarias for delete to authenticated
  using (exists (select 1 from public.perfiles where id = (select auth.uid()) and es_administrador));
