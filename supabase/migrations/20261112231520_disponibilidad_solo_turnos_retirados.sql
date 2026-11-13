create or replace function private.guardar_disponibilidad_semanal(p_horarios jsonb, p_confirmar boolean default false, p_citas uuid[] default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare afectadas uuid[]; item jsonb; momento timestamptz;
begin
  if not exists (select 1 from public.perfiles where id = (select auth.uid()) and es_administrador) then
    raise exception 'Se requiere acceso de administrador' using errcode = '42501';
  end if;
  if p_horarios is null or jsonb_typeof(p_horarios) <> 'array' or jsonb_array_length(p_horarios) > 168 then
    raise exception 'Disponibilidad inválida' using errcode = '22023';
  end if;
  for item in select * from jsonb_array_elements(p_horarios) loop
    if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'dia') <> 'number' or jsonb_typeof(item->'hora') <> 'number'
      or (item->>'dia') !~ '^[1-7]$' or (item->>'hora') !~ '^([0-9]|1[0-9]|2[0-3])$' then
      raise exception 'Disponibilidad inválida' using errcode = '22023';
    end if;
  end loop;
  if (select count(*) from jsonb_array_elements(p_horarios)) <>
     (select count(distinct (x->>'dia', x->>'hora')) from jsonb_array_elements(p_horarios) x) then
    raise exception 'Disponibilidad duplicada' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(87194531);
  momento := clock_timestamp();
  select coalesce(array_agg(c.id order by c.id), '{}'::uuid[]) into afectadas
  from public.citas c where c.inicio > momento and c.estado in ('pendiente', 'confirmada', 'propuesta')
    and not exists (select 1 from jsonb_array_elements(p_horarios) h
      where (h->>'dia')::integer = extract(isodow from timezone('America/Montevideo', c.inicio))
        and (h->>'hora')::integer = extract(hour from timezone('America/Montevideo', c.inicio)));
  if exists (select 1 from public.citas c where c.id = any(afectadas) and c.inicio <= momento + interval '24 hours') then
    return jsonb_build_object('resultado', 'dentro_del_plazo');
  end if;
  if cardinality(afectadas) > 0 and (not coalesce(p_confirmar, false) or p_citas is distinct from afectadas) then
    return jsonb_build_object('resultado', 'confirmacion', 'citas', to_jsonb(afectadas), 'cantidad', cardinality(afectadas));
  end if;
  update public.citas set estado = 'cancelada' where id = any(afectadas) and estado in ('pendiente', 'confirmada', 'propuesta');
  delete from private.disponibilidad_semanal d
    where not exists (select 1 from jsonb_array_elements(p_horarios) h
      where (h->>'dia')::integer = d.dia and (h->>'hora')::integer = d.hora);
  insert into private.disponibilidad_semanal (dia, hora)
    select (h->>'dia')::integer, (h->>'hora')::integer from jsonb_array_elements(p_horarios) h
    on conflict (dia, hora) do nothing;
  return jsonb_build_object('resultado', 'guardada');
end;
$$;
