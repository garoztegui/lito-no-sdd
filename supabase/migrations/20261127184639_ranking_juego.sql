create table private.ranking_juego (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 40),
  puntos integer not null check (puntos >= 0)
);

create function public.mi_record_juego()
returns table(nombre text, puntos integer)
language sql security definer set search_path = ''
as $$
  select r.nombre, r.puntos from private.ranking_juego r where r.usuario_id = auth.uid();
$$;

create function public.ranking_juego()
returns table(nombre text, puntos integer)
language sql security definer set search_path = ''
as $$
  select r.nombre, r.puntos from private.ranking_juego r
  where auth.uid() is not null order by r.puntos desc, r.nombre asc;
$$;

create function public.guardar_record_juego(p_nombre text, p_puntos integer)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or p_nombre is null or length(trim(p_nombre)) not between 1 and 40 or p_puntos is null or p_puntos < 0 then
    raise exception 'Datos inválidos';
  end if;
  insert into private.ranking_juego as r (usuario_id, nombre, puntos)
  values (auth.uid(), trim(p_nombre), p_puntos)
  on conflict (usuario_id) do update set puntos = greatest(r.puntos, excluded.puntos);
end;
$$;

revoke all on function public.mi_record_juego() from public, anon;
revoke all on function public.ranking_juego() from public, anon;
revoke all on function public.guardar_record_juego(text, integer) from public, anon;
grant execute on function public.mi_record_juego() to authenticated;
grant execute on function public.ranking_juego() to authenticated;
grant execute on function public.guardar_record_juego(text, integer) to authenticated;
