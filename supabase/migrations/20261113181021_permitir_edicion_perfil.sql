revoke update on public.perfiles from public, anon, authenticated;
grant update (nombre, telefono, sexo) on public.perfiles to authenticated;

create policy "Clientes actualizan su perfil" on public.perfiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
