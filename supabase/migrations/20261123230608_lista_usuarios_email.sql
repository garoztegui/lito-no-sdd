create function private.lista_usuarios_email()
returns table (nombre text, email text, telefono text, sexo text, es_administrador boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  return query select p.nombre, u.email::text, p.telefono, p.sexo, p.es_administrador
    from public.perfiles p join auth.users u on u.id = p.id
    order by p.nombre, p.id;
end;
$$;
revoke all on function private.lista_usuarios_email() from public, anon;
grant execute on function private.lista_usuarios_email() to authenticated;
create function public.lista_usuarios_email()
returns table (nombre text, email text, telefono text, sexo text, es_administrador boolean)
language sql stable security invoker set search_path = '' as $$
  select * from private.lista_usuarios_email();
$$;
revoke all on function public.lista_usuarios_email() from public, anon;
grant execute on function public.lista_usuarios_email() to authenticated;
