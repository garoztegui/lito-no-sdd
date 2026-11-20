-- Google does not provide a telephone number or a value for sexo.
alter table public.perfiles drop constraint nombre_obligatorio;
alter table public.perfiles drop constraint telefono_obligatorio;
alter table public.perfiles drop constraint sexo_opciones;
alter table public.perfiles add constraint nombre_valido check (nombre is null or length(trim(nombre)) > 0) not valid;
alter table public.perfiles add constraint telefono_valido check (telefono is null or length(trim(telefono)) > 0) not valid;
alter table public.perfiles add constraint sexo_valido check (sexo is null or sexo in ('Hombre', 'Mujer', 'Prefiero no especificar')) not valid;

create or replace function private.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  nombre_perfil text := nullif(trim(coalesce(new.raw_user_meta_data->>'nombre', new.raw_user_meta_data->>'full_name')), '');
  telefono_perfil text := nullif(trim(new.raw_user_meta_data->>'telefono'), '');
  sexo_perfil text := new.raw_user_meta_data->>'sexo';
begin
  if coalesce(new.raw_app_meta_data->>'provider', '') = 'google' then
    telefono_perfil := null;
    sexo_perfil := null;
  end if;
  if coalesce(new.raw_app_meta_data->>'provider', '') <> 'google'
     and (nombre_perfil is null or telefono_perfil is null or sexo_perfil is null) then
    raise exception 'Los datos del perfil son obligatorios' using errcode = '23514';
  end if;
  insert into public.perfiles (id, nombre, telefono, sexo)
  values (new.id, nombre_perfil, telefono_perfil, sexo_perfil);
  return new;
end;
$$;

create function private.validar_perfil_actualizado() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.nombre is null or new.telefono is null or new.sexo is null then
    raise exception 'Los datos del perfil son obligatorios' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validar_perfil_actualizado() from public;
create trigger validar_perfil_actualizado before update of nombre, telefono, sexo on public.perfiles
for each row execute function private.validar_perfil_actualizado();

-- Restrictive policies combine with existing ownership policies instead of replacing them.
create policy "Perfil completo para consultar citas" on public.citas as restrictive
for select to authenticated using (
  exists (select 1 from public.perfiles p where p.id = (select auth.uid())
    and length(trim(p.nombre)) > 0 and length(trim(p.telefono)) > 0
    and p.sexo in ('Hombre', 'Mujer', 'Prefiero no especificar'))
);

-- Also covers SECURITY DEFINER appointment functions, which bypass row policies.
create function private.exigir_perfil_para_cita() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not exists (
    select 1 from public.perfiles p where p.id = (select auth.uid())
      and length(trim(p.nombre)) > 0 and length(trim(p.telefono)) > 0
      and p.sexo in ('Hombre', 'Mujer', 'Prefiero no especificar')
  ) then
    raise exception 'Completá tu perfil antes de continuar' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.exigir_perfil_para_cita() from public;
create trigger exigir_perfil_para_cita before insert or update on public.citas
for each row execute function private.exigir_perfil_para_cita();

-- These read functions use SECURITY DEFINER and therefore cannot rely on RLS.
create function private.exigir_perfil_completo() returns void
language plpgsql stable security invoker set search_path = '' as $$
begin
  -- Preserve internal database and service calls that have no user session.
  if (select auth.uid()) is null and current_setting('role', true) <> 'authenticated' then
    return;
  end if;
  if not exists (
    select 1 from public.perfiles p where p.id = (select auth.uid())
      and length(trim(p.nombre)) > 0 and length(trim(p.telefono)) > 0
      and p.sexo in ('Hombre', 'Mujer', 'Prefiero no especificar')
  ) then
    raise exception 'Completá tu perfil antes de continuar' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.exigir_perfil_completo() from public, anon;
grant execute on function private.exigir_perfil_completo() to authenticated;

create or replace function private.listar_servicios()
returns table (id uuid, nombre text) language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.exigir_perfil_completo();
  return query select s.id, s.nombre from private.servicios s where not s.bloqueado order by s.nombre, s.id;
end;
$$;

create or replace function private.disponibilidad_semanal_actual()
returns table (dia integer, hora integer) language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.exigir_perfil_completo();
  return query select d.dia, d.hora from private.disponibilidad_semanal d order by d.dia, d.hora;
end;
$$;

create or replace function private.horarios_ocupados(desde timestamptz, hasta timestamptz)
returns table (inicio timestamptz) language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.exigir_perfil_completo();
  return query select c.inicio from public.citas c
    where (select auth.uid()) is not null and c.inicio >= desde and c.inicio < hasta
      and (c.estado = 'confirmada' or (c.estado in ('pendiente', 'propuesta') and c.inicio > now() + interval '24 hours'));
end;
$$;

create or replace function private.horarios_bloqueados(p_fecha date)
returns table (hora integer) language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.exigir_perfil_completo();
  return query select distinct h from private.bloqueos b cross join lateral generate_series(b.hora_inicio, b.hora_fin - 1) h
    where b.fecha = p_fecha and (select auth.uid()) is not null order by h;
end;
$$;

create or replace function private.inicio_disponible(p_inicio timestamptz)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.exigir_perfil_completo();
  return date_trunc('hour', timezone('America/Montevideo', p_inicio)) = timezone('America/Montevideo', p_inicio)
    and exists (select 1 from private.disponibilidad_semanal d
      where d.dia = extract(isodow from timezone('America/Montevideo', p_inicio))
        and d.hora = extract(hour from timezone('America/Montevideo', p_inicio)))
    and not exists (select 1 from private.bloqueos b
      where b.fecha = timezone('America/Montevideo', p_inicio)::date
        and extract(hour from timezone('America/Montevideo', p_inicio)) >= b.hora_inicio
        and extract(hour from timezone('America/Montevideo', p_inicio)) < b.hora_fin);
end;
$$;

create or replace function private.reclamar_bienvenida() returns boolean
language plpgsql security definer set search_path = '' as $$
declare usuario uuid := (select auth.uid());
begin
  if usuario is null then
    raise exception 'Se requiere iniciar sesión' using errcode = '42501';
  end if;
  perform private.exigir_perfil_completo();
  insert into private.bienvenidas (usuario_id) values (usuario)
  on conflict do nothing;
  return found;
end;
$$;
