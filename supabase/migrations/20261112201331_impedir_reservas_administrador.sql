create policy "Solo clientes pueden solicitar citas"
on public.citas as restrictive for insert to authenticated
with check (
  exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid()) and p.es_administrador = false
  )
);
