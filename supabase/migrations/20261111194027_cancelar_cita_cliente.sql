create function private.cancelar_cita_cliente(p_cita_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare cita public.citas%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Se requiere iniciar sesión' using errcode = '42501';
  end if;
  select c.* into cita from public.citas c
  where c.id = p_cita_id and c.cliente_id = (select auth.uid()) for update;
  if not found or cita.estado not in ('pendiente', 'confirmada') then
    return 'no_disponible';
  end if;
  if cita.inicio <= now() + interval '24 hours' then
    return 'fuera_de_plazo';
  end if;
  update public.citas set estado = 'cancelada' where id = p_cita_id;
  return 'cancelada';
end;
$$;
revoke all on function private.cancelar_cita_cliente(uuid) from public, anon;
grant execute on function private.cancelar_cita_cliente(uuid) to authenticated;

create function public.cancelar_cita_cliente(p_cita_id uuid)
returns text language sql security invoker set search_path = '' as $$
  select private.cancelar_cita_cliente(p_cita_id);
$$;
revoke all on function public.cancelar_cita_cliente(uuid) from public, anon;
grant execute on function public.cancelar_cita_cliente(uuid) to authenticated;
