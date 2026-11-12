import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const ejecutar = sql => execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

test('bloquear y borrar un servicio requieren permisos administrativos', () => {
  const salida = ejecutar(`begin;
    do $$ begin
      begin perform public.bloquear_servicio(gen_random_uuid()); raise exception 'Se permitió bloquear sin sesión';
      exception when insufficient_privilege then null; end;
      begin perform public.borrar_servicio(gen_random_uuid()); raise exception 'Se permitió borrar sin sesión';
      exception when insufficient_privilege then null; end;
    end $$;
    rollback;`);
  assert.match(salida, /ROLLBACK/);
});

test('bloquear y borrar respetan reservas futuras, permisos e identidad histórica', () => {
  const sql = `begin;
    create temp table prueba_retiro (admin uuid, cliente uuid, pendiente uuid, propuesta uuid, confirmada uuid, libre uuid, nombre_libre text, pasada uuid, cancelada uuid, rechazada uuid, fecha_libre timestamptz);
    insert into auth.users (id, email, raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009931', 'story12-admin@example.test', '{"nombre":"Admin","telefono":"123","sexo":"Mujer"}'),
      ('00000000-0000-0000-0000-000000009932', 'story12-cliente@example.test', '{"nombre":"Cliente","telefono":"123","sexo":"Mujer"}');
    update public.perfiles set es_administrador = true where id = '00000000-0000-0000-0000-000000009931';
    do $$ declare a uuid; b uuid; c uuid; d uuid; nombre_d text := 'Servicio libre ' || gen_random_uuid();
      pasada_id uuid; cancelada_id uuid; rechazada_id uuid; fecha_disponible timestamptz;
    begin
      insert into private.servicios (nombre) values ('Servicio pendiente ' || gen_random_uuid()) returning id into a;
      insert into private.servicios (nombre) values ('Servicio propuesta ' || gen_random_uuid()) returning id into b;
      insert into private.servicios (nombre) values ('Servicio confirmada ' || gen_random_uuid()) returning id into c;
      insert into private.servicios (nombre) values (nombre_d) returning id into d;
      insert into public.citas (cliente_id, inicio, servicio, estado)
        select '00000000-0000-0000-0000-000000009931', now() + interval '300 days', nombre, 'pendiente' from private.servicios where id = a;
      insert into public.citas (cliente_id, inicio, servicio, estado)
        select '00000000-0000-0000-0000-000000009931', now() + interval '300 days 1 minute', nombre, 'propuesta' from private.servicios where id = b;
      insert into public.citas (cliente_id, inicio, servicio, estado)
        select '00000000-0000-0000-0000-000000009931', now() + interval '300 days 2 minutes', nombre, 'confirmada' from private.servicios where id = c;
      insert into public.citas (cliente_id, inicio, servicio, estado) values ('00000000-0000-0000-0000-000000009931', now() - interval '1 day', nombre_d, 'confirmada') returning id into pasada_id;
      insert into public.citas (cliente_id, inicio, servicio, estado) values ('00000000-0000-0000-0000-000000009931', now() + interval '300 days 3 minutes', nombre_d, 'cancelada') returning id into cancelada_id;
      insert into public.citas (cliente_id, inicio, servicio, estado) values ('00000000-0000-0000-0000-000000009931', now() + interval '300 days 4 minutes', nombre_d, 'rechazada') returning id into rechazada_id;
      select candidato into fecha_disponible from generate_series(date_trunc('hour', now() + interval '35 days'), now() + interval '80 days', interval '1 hour') candidato
        where private.inicio_disponible(candidato) and not exists (select 1 from public.citas c where c.inicio = candidato and c.estado in ('pendiente','confirmada','propuesta')) limit 1;
      if fecha_disponible is null then raise exception 'No hay horario de prueba'; end if;
      insert into prueba_retiro values ('00000000-0000-0000-0000-000000009931', '00000000-0000-0000-0000-000000009932', a, b, c, d, nombre_d, pasada_id, cancelada_id, rechazada_id, fecha_disponible);
    end $$;
    grant select on prueba_retiro to authenticated;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', (select cliente::text from prueba_retiro), true);
    do $$ begin
      begin perform public.bloquear_servicio((select pendiente from prueba_retiro)); raise exception 'Cliente pudo bloquear';
      exception when insufficient_privilege then null; end;
      begin perform public.borrar_servicio((select libre from prueba_retiro)); raise exception 'Cliente pudo borrar';
      exception when insufficient_privilege then null; end;
      begin perform public.listar_servicios_admin(); raise exception 'Cliente pudo consultar catálogo administrativo';
      exception when insufficient_privilege then null; end;
    end $$;
    select set_config('request.jwt.claim.sub', (select admin::text from prueba_retiro), true);
    do $$ declare r prueba_retiro%rowtype; nombre_bloqueado text; nuevo_id uuid;
    begin
      select * into r from prueba_retiro;
      if public.borrar_servicio(r.pendiente) <> 'tiene_citas' or public.borrar_servicio(r.propuesta) <> 'tiene_citas'
        or public.borrar_servicio(r.confirmada) <> 'tiene_citas' then raise exception 'Se permitió borrar con citas activas'; end if;
      select nombre into nombre_bloqueado from public.listar_servicios_admin() where id = r.pendiente;
      if public.bloquear_servicio(r.pendiente) <> 'bloqueado' then raise exception 'No se bloqueó el servicio'; end if;
      if exists (select 1 from public.listar_servicios() where id = r.pendiente)
        or not exists (select 1 from public.listar_servicios_admin() where id = r.pendiente and bloqueado)
        or not exists (select 1 from public.citas where servicio_id = r.pendiente and estado = 'pendiente' and servicio = nombre_bloqueado) then
        raise exception 'El bloqueo alteró la cita o dejó disponible el servicio';
      end if;
      begin perform public.solicitar_cita(r.fecha_libre, nombre_bloqueado); raise exception 'Se pudo reservar un servicio bloqueado';
      exception when check_violation then null; end;
      if public.borrar_servicio(r.libre) <> 'borrado' then raise exception 'No se borró un servicio sin citas activas'; end if;
      if exists (select 1 from public.listar_servicios_admin() where id = r.libre)
        or (select servicio from public.citas where id = r.pasada) <> r.nombre_libre
        or (select servicio from public.citas where id = r.cancelada) <> r.nombre_libre
        or (select servicio from public.citas where id = r.rechazada) <> r.nombre_libre then raise exception 'El borrado alteró el historial'; end if;
      if public.crear_servicio(r.nombre_libre) <> 'creado' then raise exception 'No se recreó el nombre'; end if;
      select id into nuevo_id from public.listar_servicios_admin() where nombre = r.nombre_libre;
      if nuevo_id = r.libre or public.renombrar_servicio(nuevo_id, r.nombre_libre || ' nuevo') <> 'actualizado' then raise exception 'No se renombró el servicio nuevo'; end if;
      if (select servicio from public.citas where id = r.cancelada) <> r.nombre_libre
        or (select servicio from public.citas where id = r.rechazada) <> r.nombre_libre then raise exception 'Se mezclaron identidades de servicios'; end if;
    end $$;
    rollback;`;
  const salida = ejecutar(sql);
  assert.match(salida, /ROLLBACK/);
});

test('la identidad de la reserva no puede falsificarse y las citas próximas impiden borrar', () => {
  const sql = `begin;
    create temp table prueba_identidad (admin uuid, cliente uuid, primero uuid, segundo uuid, nombre text, fecha timestamptz);
    insert into auth.users (id, email, raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009933', 'story12-identidad-admin@example.test', '{"nombre":"Admin","telefono":"123","sexo":"Mujer"}'),
      ('00000000-0000-0000-0000-000000009934', 'story12-identidad-cliente@example.test', '{"nombre":"Cliente","telefono":"123","sexo":"Mujer"}');
    update public.perfiles set es_administrador = true where id = '00000000-0000-0000-0000-000000009933';
    do $$ declare primero_id uuid; segundo_id uuid; nombre_primero text := 'Identidad ' || gen_random_uuid(); fecha_disponible timestamptz; begin
      insert into private.servicios (nombre) values (nombre_primero) returning id into primero_id;
      insert into private.servicios (nombre) values ('Otro ' || gen_random_uuid()) returning id into segundo_id;
      insert into public.citas (cliente_id, inicio, servicio, estado) values
        ('00000000-0000-0000-0000-000000009933', now() + interval '1 hour 19 seconds', nombre_primero, 'pendiente'),
        ('00000000-0000-0000-0000-000000009933', now() + interval '2 hours 19 seconds', nombre_primero, 'propuesta'),
        ('00000000-0000-0000-0000-000000009933', now() + interval '3 hours 19 seconds', nombre_primero, 'confirmada');
      select candidato into fecha_disponible from generate_series(date_trunc('hour', now() + interval '35 days'), now() + interval '80 days', interval '1 hour') candidato
        where private.inicio_disponible(candidato) and not exists (select 1 from public.citas c where c.inicio = candidato and c.estado in ('pendiente','confirmada','propuesta')) limit 1;
      if fecha_disponible is null then raise exception 'No hay horario de prueba'; end if;
      insert into prueba_identidad values ('00000000-0000-0000-0000-000000009933', '00000000-0000-0000-0000-000000009934', primero_id, segundo_id, nombre_primero, fecha_disponible);
    end $$;
    grant select on prueba_identidad to authenticated;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', (select cliente::text from prueba_identidad), true);
    do $$ declare r prueba_identidad%rowtype; reserva uuid; identidad uuid; begin
      select * into r from prueba_identidad;
      insert into public.citas (inicio, servicio, servicio_id) values (r.fecha, r.nombre, r.segundo) returning id, servicio_id into reserva, identidad;
      if identidad <> r.primero then raise exception 'Se aceptó una identidad falsa'; end if;
      update public.citas set servicio_id = r.segundo where id = reserva;
      if (select servicio_id from public.citas where id = reserva) <> r.primero then raise exception 'Se permitió cambiar la identidad'; end if;
    end $$;
    select set_config('request.jwt.claim.sub', (select admin::text from prueba_identidad), true);
    do $$ begin
      if public.borrar_servicio((select primero from prueba_identidad)) <> 'tiene_citas' then raise exception 'Se borró un servicio con citas próximas'; end if;
    end $$;
    rollback;`;
  const salida = ejecutar(sql);
  assert.match(salida, /ROLLBACK/);
});
