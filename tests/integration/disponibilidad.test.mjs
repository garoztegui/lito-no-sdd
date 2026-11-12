import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('la disponibilidad semanal conserva los turnos iniciales y solo el administrador puede modificarla', () => {
  const sql = `begin;
    do $$ begin
      if (select count(*) from public.disponibilidad_semanal()) <> 60 then raise exception 'disponibilidad inicial incorrecta'; end if;
      begin
        perform public.guardar_disponibilidad_semanal('[]'::jsonb, false);
        raise exception 'la operación sin sesión fue aceptada';
      exception when insufficient_privilege then null; end;
    end $$;
    rollback;`;
  const salida = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' });
  assert.match(salida, /ROLLBACK/);
});

test('una reducción requiere confirmación y protege las citas dentro de 24 horas', () => {
  const sql = `begin;
  do $$
  declare admin_id uuid := gen_random_uuid(); cliente_id uuid := gen_random_uuid();
    fecha timestamptz; fecha_nueva timestamptz; cerca timestamptz; cita_id uuid; cita_nueva uuid; cita_cerca uuid;
    dia_objetivo integer; hora_objetivo integer; horarios jsonb; resultado jsonb; ids uuid[];
  begin
    insert into auth.users (id, email, raw_user_meta_data) values
      (admin_id, admin_id::text || '@example.test', '{"nombre":"Admin","telefono":"123","sexo":"Mujer"}'),
      (cliente_id, cliente_id::text || '@example.test', '{"nombre":"Cliente","telefono":"123","sexo":"Mujer"}');
    update public.perfiles set es_administrador = true where id = admin_id;
    select fecha_candidata into fecha from generate_series(date_trunc('hour', now() + interval '3 days'), now() + interval '80 days', interval '1 hour') fecha_candidata
      where private.inicio_disponible(fecha_candidata)
        and not exists (select 1 from public.citas c where c.inicio = fecha_candidata and c.estado in ('pendiente','propuesta','confirmada'))
        and not exists (select 1 from public.citas c where c.inicio > now() and c.inicio <= now() + interval '24 hours'
          and c.estado in ('pendiente','propuesta','confirmada')
          and extract(isodow from timezone('America/Montevideo', c.inicio)) = extract(isodow from timezone('America/Montevideo', fecha_candidata))
          and extract(hour from timezone('America/Montevideo', c.inicio)) = extract(hour from timezone('America/Montevideo', fecha_candidata)))
      limit 1;
    if fecha is null then raise exception 'Sin horario para prueba'; end if;
    dia_objetivo := extract(isodow from timezone('America/Montevideo', fecha));
    hora_objetivo := extract(hour from timezone('America/Montevideo', fecha));
    insert into public.citas (cliente_id, inicio, servicio, estado) values (cliente_id, fecha, 'Espalda', 'confirmada') returning id into cita_id;
    select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia, 'hora', d.hora)), '[]'::jsonb) into horarios
      from private.disponibilidad_semanal d where not (d.dia = dia_objetivo and d.hora = hora_objetivo);
    perform set_config('request.jwt.claim.sub', admin_id::text, true);
    resultado := public.guardar_disponibilidad_semanal(horarios, false);
    if resultado->>'resultado' <> 'confirmacion' or not ((resultado->'citas') ? cita_id::text) then raise exception 'Falta confirmación: %', resultado; end if;
    if (select estado from public.citas where id = cita_id) <> 'confirmada' or not private.inicio_disponible(fecha) then raise exception 'La previsualización modificó datos'; end if;
    select array_agg(value::uuid order by value::uuid) into ids from jsonb_array_elements_text(resultado->'citas');
    select candidato into fecha_nueva from generate_series(fecha + interval '7 days', fecha + interval '70 days', interval '7 days') candidato
      where not exists (select 1 from public.citas c where c.inicio = candidato and c.estado in ('pendiente', 'propuesta', 'confirmada')) limit 1;
    insert into public.citas (cliente_id, inicio, servicio, estado) values (cliente_id, fecha_nueva, 'Espalda', 'pendiente') returning id into cita_nueva;
    resultado := public.guardar_disponibilidad_semanal(horarios, true, ids);
    if resultado->>'resultado' <> 'confirmacion' or not ((resultado->'citas') ? cita_nueva::text)
      or (select estado from public.citas where id = cita_id) <> 'confirmada' then raise exception 'Confirmación obsoleta modificó las citas'; end if;
    select array_agg(value::uuid order by value::uuid) into ids from jsonb_array_elements_text(resultado->'citas');
    resultado := public.guardar_disponibilidad_semanal(horarios, true, ids);
    if resultado->>'resultado' <> 'guardada' or (select estado from public.citas where id = cita_id) <> 'cancelada'
      or (select estado from public.citas where id = cita_nueva) <> 'cancelada' or private.inicio_disponible(fecha) then raise exception 'No se aplicó la cancelación confirmada'; end if;
    perform set_config('request.jwt.claim.sub', '', true);
    cerca := date_trunc('hour', now() + interval '2 hours') + interval '17 seconds';
    insert into public.citas (cliente_id, inicio, servicio, estado) values (cliente_id, cerca, 'Espalda', 'confirmada') returning id into cita_cerca;
    dia_objetivo := extract(isodow from timezone('America/Montevideo', cerca)); hora_objetivo := extract(hour from timezone('America/Montevideo', cerca));
    select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia, 'hora', d.hora)), '[]'::jsonb) into horarios
      from private.disponibilidad_semanal d where not (d.dia = dia_objetivo and d.hora = hora_objetivo);
    perform set_config('request.jwt.claim.sub', admin_id::text, true);
    resultado := public.guardar_disponibilidad_semanal(horarios, true, '{}'::uuid[]);
    if resultado->>'resultado' <> 'dentro_del_plazo' or (select estado from public.citas where id = cita_cerca) <> 'confirmada' then raise exception 'El plazo no protegió la cita: %', resultado; end if;
  end $$;
  rollback;`;
  const salida = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' });
  assert.match(salida, /ROLLBACK/);
});

test('un cliente autenticado no puede cambiar la disponibilidad ni leer la tabla privada', () => {
  const sql = `begin;
    insert into auth.users (id, email, raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009901', 'story9-permiso@example.test', '{"nombre":"Cliente","telefono":"123","sexo":"Mujer"}');
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000009901', true);
    do $$ begin
      if (select count(*) from public.disponibilidad_semanal()) <> 60 then raise exception 'No pudo leer la disponibilidad'; end if;
      begin perform public.guardar_disponibilidad_semanal('[]'::jsonb, false); raise exception 'Un cliente pudo guardar';
      exception when insufficient_privilege then null; end;
      begin perform count(*) from private.disponibilidad_semanal; raise exception 'Un cliente leyó la tabla privada';
      exception when insufficient_privilege then null; end;
    end $$;
    rollback;`;
  const salida = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' });
  assert.match(salida, /ROLLBACK/);
});
