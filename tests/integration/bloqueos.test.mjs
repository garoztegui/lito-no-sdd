import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const ejecutar = sql => execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

test('los bloqueos requieren administrador y no alteran la disponibilidad semanal', () => {
  const resultado = ejecutar(`begin;
    do $$ begin
      if (select count(*) from public.horarios_bloqueados(current_date + 30)) <> 0 then raise exception 'Hay bloqueos inesperados'; end if;
      begin perform public.guardar_bloqueo(current_date + 30, 8, 9, false, null); raise exception 'Se aceptó una operación sin sesión';
      exception when insufficient_privilege then null; end;
    end $$;
    rollback;`);
  assert.match(resultado, /ROLLBACK/);
});

test('un bloqueo respeta citas, confirmación, plazo, eliminación y permisos', () => {
  const sql = `begin;
    create temp table prueba_bloqueo (admin uuid, cliente uuid, fecha date, cita uuid, cerca uuid);
    insert into auth.users (id, email, raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009911', 'story10-admin@example.test', '{"nombre":"Admin","telefono":"123","sexo":"Mujer"}'),
      ('00000000-0000-0000-0000-000000009912', 'story10-cliente@example.test', '{"nombre":"Cliente","telefono":"123","sexo":"Mujer"}');
    update public.perfiles set es_administrador = true where id = '00000000-0000-0000-0000-000000009911';
    insert into prueba_bloqueo (admin, cliente, fecha)
      select '00000000-0000-0000-0000-000000009911', '00000000-0000-0000-0000-000000009912', dia from (
        select (timezone('America/Montevideo', now())::date + n) dia from generate_series(35, 80) n
      ) d where extract(isodow from dia) between 1 and 5
        and not exists (select 1 from public.citas c where timezone('America/Montevideo', c.inicio)::date = dia
          and extract(hour from timezone('America/Montevideo', c.inicio)) between 10 and 12 and c.estado in ('pendiente','confirmada','propuesta'))
        and private.inicio_disponible((dia::timestamp + interval '10 hours') at time zone 'America/Montevideo')
        and private.inicio_disponible((dia::timestamp + interval '11 hours') at time zone 'America/Montevideo')
        and private.inicio_disponible((dia::timestamp + interval '12 hours') at time zone 'America/Montevideo') limit 1;
    do $$ declare r prueba_bloqueo%rowtype; id_cita uuid; id_cerca uuid; begin
      select * into r from prueba_bloqueo;
      if r.fecha is null then raise exception 'No hay fecha de prueba disponible'; end if;
      insert into public.citas (cliente_id, inicio, servicio, estado)
        values (r.admin, (r.fecha::timestamp + interval '10 hours') at time zone 'America/Montevideo', 'Espalda', 'confirmada') returning id into id_cita;
      insert into public.citas (cliente_id, inicio, servicio, estado)
        values (r.admin, now() + interval '2 hours 17 seconds', 'Espalda', 'confirmada') returning id into id_cerca;
      update prueba_bloqueo set cita = id_cita, cerca = id_cerca;
    end $$;
    grant select on prueba_bloqueo to authenticated;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', (select cliente::text from prueba_bloqueo), true);
    do $$ begin
      begin perform public.guardar_bloqueo((select fecha from prueba_bloqueo), 12, 13, false, null); raise exception 'Cliente pudo bloquear';
      exception when insufficient_privilege then null; end;
      begin perform public.listar_bloqueos(); raise exception 'Cliente pudo listar bloqueos';
      exception when insufficient_privilege then null; end;
      begin perform public.eliminar_bloqueo(gen_random_uuid()); raise exception 'Cliente pudo eliminar';
      exception when insufficient_privilege then null; end;
    end $$;
    select set_config('request.jwt.claim.sub', (select admin::text from prueba_bloqueo), true);
    do $$ declare r prueba_bloqueo%rowtype; resultado jsonb; ids uuid[]; bloqueo uuid; fecha_cerca date;
    begin
      select * into r from prueba_bloqueo;
      resultado := public.guardar_bloqueo(r.fecha, 12, 13, false, null);
      if resultado->>'resultado' <> 'guardado' or not exists (select 1 from public.horarios_bloqueados(r.fecha) where hora = 12)
        or private.inicio_disponible((r.fecha::timestamp + interval '12 hours') at time zone 'America/Montevideo') then raise exception 'Bloqueo sin citas no aplicado: %', resultado; end if;
      perform set_config('request.jwt.claim.sub', r.cliente::text, true);
      begin
        perform public.solicitar_cita((r.fecha::timestamp + interval '12 hours') at time zone 'America/Montevideo', 'Espalda');
        raise exception 'Se aceptó una reserva en el bloqueo';
      exception when check_violation then null; end;
      perform set_config('request.jwt.claim.sub', r.admin::text, true);
      select id into bloqueo from public.listar_bloqueos() where fecha = r.fecha and hora_inicio = 12 and hora_fin = 13;
      if public.eliminar_bloqueo(bloqueo) <> 'eliminado' then raise exception 'No se eliminó el bloqueo'; end if;
      if exists (select 1 from public.horarios_bloqueados(r.fecha) where hora = 12)
        or not private.inicio_disponible((r.fecha::timestamp + interval '12 hours') at time zone 'America/Montevideo') then raise exception 'Eliminar no restauró el horario'; end if;
      resultado := public.guardar_bloqueo('2099-01-01'::date, 0, 24, false, null);
      if resultado->>'resultado' <> 'guardado' or (select count(*) from public.horarios_bloqueados('2099-01-01'::date)) <> 24 then raise exception 'El bloqueo de día completo no cubre 24 horas'; end if;
      resultado := public.guardar_bloqueo(r.fecha, 10, 12, false, null);
      if resultado->>'resultado' <> 'confirmacion' or not ((resultado->'citas') ? r.cita::text) or (select estado from public.citas where id = r.cita) <> 'confirmada' then raise exception 'Previsualización incorrecta: %', resultado; end if;
      select array_agg(value::uuid order by value::uuid) into ids from jsonb_array_elements_text(resultado->'citas');
      perform set_config('request.jwt.claim.sub', r.cliente::text, true);
      perform public.solicitar_cita((r.fecha::timestamp + interval '11 hours') at time zone 'America/Montevideo', 'Espalda');
      perform set_config('request.jwt.claim.sub', r.admin::text, true);
      resultado := public.guardar_bloqueo(r.fecha, 10, 12, true, ids);
      if resultado->>'resultado' <> 'confirmacion' or (select estado from public.citas where id = r.cita) <> 'confirmada' then raise exception 'Confirmación obsoleta alteró datos'; end if;
      select array_agg(value::uuid order by value::uuid) into ids from jsonb_array_elements_text(resultado->'citas');
      resultado := public.guardar_bloqueo(r.fecha, 10, 12, true, ids);
      if resultado->>'resultado' <> 'guardado' or (select estado from public.citas where id = r.cita) <> 'cancelada'
        or (select count(*) from public.horarios_bloqueados(r.fecha) where hora in (10, 11)) <> 2 then raise exception 'Confirmación no aplicada: %', resultado; end if;
      select timezone('America/Montevideo', inicio)::date into fecha_cerca from public.citas where id = r.cerca;
      resultado := public.guardar_bloqueo(fecha_cerca, 0, 24, true, ids);
      if resultado->>'resultado' <> 'dentro_del_plazo' or (select estado from public.citas where id = r.cerca) <> 'confirmada' then raise exception 'No se protegió la cita cercana: %', resultado; end if;
    end $$;
    rollback;`;
  const resultado = ejecutar(sql);
  assert.match(resultado, /ROLLBACK/);
});

test('no se proponen horarios bloqueados ni se eliminan bloqueos pasados', () => {
  const sql = `begin;
    create temp table prueba_propuesta (admin uuid, fecha date, cita uuid, pasado uuid);
    insert into auth.users (id, email, raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009913', 'story10-propuesta@example.test', '{"nombre":"Admin","telefono":"123","sexo":"Mujer"}');
    update public.perfiles set es_administrador = true where id = '00000000-0000-0000-0000-000000009913';
    insert into prueba_propuesta (admin, fecha) select '00000000-0000-0000-0000-000000009913', dia from (
      select (timezone('America/Montevideo', now())::date + n) dia from generate_series(35, 75) n
    ) d where extract(isodow from dia) between 1 and 5
      and private.inicio_disponible((dia::timestamp + interval '10 hours') at time zone 'America/Montevideo')
      and private.inicio_disponible((dia::timestamp + interval '11 hours') at time zone 'America/Montevideo')
      and not exists (select 1 from public.citas c where timezone('America/Montevideo', c.inicio)::date = dia
        and extract(hour from timezone('America/Montevideo', c.inicio)) in (10, 11) and c.estado in ('pendiente','confirmada','propuesta')) limit 1;
    do $$ declare r prueba_propuesta%rowtype; cita_id uuid; pasado_id uuid; begin
      select * into r from prueba_propuesta;
      if r.fecha is null then raise exception 'No hay fecha de prueba'; end if;
      insert into public.citas (cliente_id, inicio, servicio, estado)
        values (r.admin, (r.fecha::timestamp + interval '10 hours') at time zone 'America/Montevideo', 'Espalda', 'pendiente') returning id into cita_id;
      insert into private.bloqueos (fecha, hora_inicio, hora_fin) values ('2000-01-01', 0, 24) returning id into pasado_id;
      update prueba_propuesta set cita = cita_id, pasado = pasado_id;
    end $$;
    grant select on prueba_propuesta to authenticated;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', (select admin::text from prueba_propuesta), true);
    do $$ declare r prueba_propuesta%rowtype; resultado jsonb; begin
      select * into r from prueba_propuesta;
      resultado := public.guardar_bloqueo(r.fecha, 11, 12, false, null);
      if resultado->>'resultado' <> 'guardado' then raise exception 'No se creó el bloqueo'; end if;
      if public.proponer_horario_administrador(r.cita, (r.fecha::timestamp + interval '11 hours') at time zone 'America/Montevideo') <> 'horario_invalido'
        or (select estado from public.citas where id = r.cita) <> 'pendiente' then raise exception 'Se aceptó una propuesta en un bloqueo'; end if;
      if public.eliminar_bloqueo(r.pasado) <> 'pasado' or not exists (select 1 from public.listar_bloqueos() where id = r.pasado) then raise exception 'Se eliminó un bloqueo pasado'; end if;
    end $$;
    rollback;`;
  const resultado = ejecutar(sql);
  assert.match(resultado, /ROLLBACK/);
});
