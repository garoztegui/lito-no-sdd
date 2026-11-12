alter table public.citas add column motivo_cancelacion text;

create function private.cancelar_cita_administrador(p_cita_id uuid, p_motivo text)
returns text language plpgsql security definer set search_path = '' as $$
declare cita public.citas%rowtype; motivo text;
begin
  if not exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  if p_motivo is null or p_motivo !~ '[^[:space:]]' then
    raise exception 'Se requiere un motivo de cancelación' using errcode = '22023';
  end if;
  motivo := regexp_replace(p_motivo, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  select c.* into cita from public.citas c where c.id = p_cita_id for update;
  if not found or cita.estado <> 'confirmada' then return 'no_disponible'; end if;
  if cita.inicio <= clock_timestamp() + interval '24 hours' then return 'fuera_de_plazo'; end if;
  update public.citas set estado = 'cancelada', motivo_cancelacion = motivo where id = p_cita_id;
  return 'cancelada';
end;
$$;
revoke all on function private.cancelar_cita_administrador(uuid, text) from public, anon;
grant execute on function private.cancelar_cita_administrador(uuid, text) to authenticated;
create function public.cancelar_cita_administrador(p_cita_id uuid, p_motivo text)
returns text language sql security invoker set search_path = '' as $$
  select private.cancelar_cita_administrador(p_cita_id, p_motivo);
$$;
revoke all on function public.cancelar_cita_administrador(uuid, text) from public, anon;
grant execute on function public.cancelar_cita_administrador(uuid, text) to authenticated;
