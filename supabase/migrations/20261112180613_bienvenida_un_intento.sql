create table private.bienvenidas (
  usuario_id uuid primary key references auth.users(id) on delete cascade
);

revoke all on private.bienvenidas from public, anon, authenticated;

create function private.reclamar_bienvenida() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  usuario uuid := (select auth.uid());
begin
  if usuario is null then
    raise exception 'Se requiere iniciar sesión' using errcode = '42501';
  end if;
  insert into private.bienvenidas (usuario_id) values (usuario)
  on conflict do nothing;
  return found;
end;
$$;
revoke all on function private.reclamar_bienvenida() from public, anon;
grant execute on function private.reclamar_bienvenida() to authenticated;

create function public.reclamar_bienvenida() returns boolean
language sql security invoker set search_path = '' as $$
  select private.reclamar_bienvenida();
$$;
revoke all on function public.reclamar_bienvenida() from public, anon;
grant execute on function public.reclamar_bienvenida() to authenticated;
