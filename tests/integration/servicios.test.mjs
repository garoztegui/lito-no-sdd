import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const ejecutar = sql => execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

test('el catálogo conserva los servicios iniciales y solo un administrador puede modificarlos', () => {
  const salida = ejecutar(`begin;
    do $$ begin
      if (select count(*) from public.listar_servicios() where nombre in ('Masaje deportivo','Cuerpo entero','Espalda')) <> 3 then raise exception 'Servicios iniciales incorrectos'; end if;
      begin perform public.crear_servicio('Prueba'); raise exception 'Se aceptó una operación sin sesión';
      exception when insufficient_privilege then null; end;
    end $$;
    rollback;`);
  assert.match(salida, /ROLLBACK/);
});

test('crear y renombrar servicios valida permisos, duplicados y conserva el historial', () => {
  const sql = `begin;
    create temp table prueba_servicios (admin uuid, cliente uuid, nombre_1 text, nombre_2 text, servicio_id uuid, pasada uuid, futura uuid, fecha timestamptz);
    insert into auth.users (id, email, raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009921', 'story11-admin@example.test', '{"nombre":"Admin","telefono":"123","sexo":"Mujer"}'),
      ('00000000-0000-0000-0000-000000009922', 'story11-cliente@example.test', '{"nombre":"Cliente","telefono":"123","sexo":"Mujer"}');
    update public.perfiles set es_administrador = true where id = '00000000-0000-0000-0000-000000009921';
    insert into prueba_servicios (admin, cliente, nombre_1, nombre_2)
      values ('00000000-0000-0000-0000-000000009921', '00000000-0000-0000-0000-000000009922', 'Servicio ' || gen_random_uuid(), 'Otro ' || gen_random_uuid());
    grant select on prueba_servicios to authenticated;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', (select cliente::text from prueba_servicios), true);
    do $$ begin
      begin perform public.crear_servicio('No autorizado'); raise exception 'Cliente pudo crear';
      exception when insufficient_privilege then null; end;
      begin perform public.renombrar_servicio(gen_random_uuid(), 'No autorizado'); raise exception 'Cliente pudo renombrar';
      exception when insufficient_privilege then null; end;
      begin perform count(*) from private.servicios; raise exception 'Cliente leyó tabla privada';
      exception when insufficient_privilege then null; end;
    end $$;
    select set_config('request.jwt.claim.sub', (select admin::text from prueba_servicios), true);
    do $$ declare r prueba_servicios%rowtype; begin
      select * into r from prueba_servicios;
      if public.crear_servicio(r.nombre_1) <> 'creado' or public.crear_servicio(r.nombre_2) <> 'creado' then raise exception 'No se creó el catálogo'; end if;
      if public.crear_servicio(r.nombre_1) <> 'nombre_existente' then raise exception 'Se aceptó un duplicado'; end if;
    end $$;
    reset role;
    select set_config('request.jwt.claim.sub', '', true);
    do $$ declare r prueba_servicios%rowtype; id_pasada uuid; id_futura uuid; fecha_disponible timestamptz; begin
      select * into r from prueba_servicios;
      update prueba_servicios set servicio_id = (select id from private.servicios where nombre = r.nombre_1);
      insert into public.citas (cliente_id, inicio, servicio, estado) values (r.admin, now() - interval '1 day', r.nombre_1, 'confirmada') returning id into id_pasada;
      insert into public.citas (cliente_id, inicio, servicio, estado) values (r.admin, now() + interval '300 days', r.nombre_1, 'cancelada') returning id into id_futura;
      insert into public.citas (cliente_id, inicio, servicio, estado) values
        (r.admin, now() + interval '300 days 1 minute', r.nombre_1, 'confirmada'),
        (r.admin, now() + interval '300 days 2 minutes', r.nombre_1, 'propuesta'),
        (r.admin, now() + interval '300 days 3 minutes', r.nombre_1, 'rechazada');
      select candidato into fecha_disponible from generate_series(date_trunc('hour', now() + interval '35 days'), now() + interval '80 days', interval '1 hour') candidato
        where private.inicio_disponible(candidato) and not exists (select 1 from public.citas c where c.inicio = candidato and c.estado in ('pendiente','confirmada','propuesta')) limit 1;
      if fecha_disponible is null then raise exception 'No hay horario de prueba'; end if;
      update prueba_servicios set pasada = id_pasada, futura = id_futura, fecha = fecha_disponible;
    end $$;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', (select admin::text from prueba_servicios), true);
    do $$ declare r prueba_servicios%rowtype; begin
      select * into r from prueba_servicios;
      if public.renombrar_servicio(r.servicio_id, r.nombre_2) <> 'nombre_existente' then raise exception 'Se aceptó renombrar a un duplicado'; end if;
      if not exists (select 1 from public.listar_servicios() where id = r.servicio_id and nombre = r.nombre_1) then raise exception 'El duplicado alteró el catálogo'; end if;
      perform set_config('request.jwt.claim.sub', r.cliente::text, true);
      perform public.solicitar_cita(r.fecha, r.nombre_1);
      perform set_config('request.jwt.claim.sub', r.admin::text, true);
      if public.renombrar_servicio(r.servicio_id, r.nombre_1 || ' nuevo') <> 'actualizado' then raise exception 'No se renombró el servicio'; end if;
      if (select servicio from public.citas where id = r.pasada) <> r.nombre_1 then raise exception 'Se alteró una cita pasada'; end if;
      if (select servicio from public.citas where id = r.futura) <> r.nombre_1 || ' nuevo' then raise exception 'No se actualizó una cita futura cancelada'; end if;
      if exists (select 1 from public.citas where servicio = r.nombre_1 and inicio > now()) then raise exception 'No se actualizaron todas las citas futuras'; end if;
      if not exists (select 1 from public.historial_cliente_administrador(r.cliente) where inicio = r.fecha and servicio = r.nombre_1 || ' nuevo') then raise exception 'No se actualizó la nueva reserva'; end if;
      perform set_config('request.jwt.claim.sub', r.cliente::text, true);
      begin perform public.solicitar_cita(r.fecha, r.nombre_1); raise exception 'Se aceptó un servicio anterior';
      exception when check_violation then null; end;
    end $$;
    rollback;`;
  const salida = ejecutar(sql);
  assert.match(salida, /ROLLBACK/);
});
