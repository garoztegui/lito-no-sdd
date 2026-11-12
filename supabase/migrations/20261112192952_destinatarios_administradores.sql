create function private.emails_administradores() returns table (email text)
language sql stable security definer set search_path = '' as $$
  select u.email::text
  from public.perfiles p
  join auth.users u on u.id = p.id
  where p.es_administrador = true and u.email is not null;
$$;
revoke all on function private.emails_administradores() from public, anon, authenticated;
