create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  telefono text,
  sexo text
);

alter table public.perfiles enable row level security;
grant select on public.perfiles to authenticated;
create policy "Clientes consultan su perfil" on public.perfiles
  for select to authenticated using ((select auth.uid()) = id);

create schema if not exists private;
create function private.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, nombre, telefono, sexo)
  values (new.id, new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'telefono', new.raw_user_meta_data->>'sexo');
  return new;
end;
$$;
revoke all on function private.crear_perfil() from public;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function private.crear_perfil();
