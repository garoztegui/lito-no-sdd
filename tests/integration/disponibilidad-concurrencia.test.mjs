import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

test('las reservas se serializan con disponibilidad, bloqueos y cambios de servicios', async () => {
  const db = `story9_${randomBytes(6).toString('hex')}`;
  const docker = (...args) => execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', ...args], { encoding: 'utf8' });
  const query = (sql) => execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-At'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000 });
  docker('createdb', '-U', 'postgres', db);
  try {
    query(`create schema auth; create schema private;
      grant usage on schema auth, private to authenticated;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create table public.perfiles (id uuid primary key, es_administrador boolean not null default false);
      create table public.citas (id uuid primary key default gen_random_uuid(), cliente_id uuid not null default auth.uid(), inicio timestamptz not null, servicio text not null, estado text not null default 'pendiente');
      alter table public.citas enable row level security;
      grant insert on public.citas to authenticated;
      create policy "Clientes solicitan citas" on public.citas for insert to authenticated with check (true);
      insert into public.perfiles values ('00000000-0000-0000-0000-000000000001', true);`);
    query(readFileSync('supabase/migrations/20261111195538_disponibilidad_semanal.sql', 'utf8'));
    const inicio = `(date_trunc('week', timezone('America/Montevideo', now())) + interval '21 days 7 hours') at time zone 'America/Montevideo'`;
    const admin = spawn('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-At'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let salida = '';
    admin.stdout.on('data', chunk => { salida += chunk; });
    admin.stderr.on('data', chunk => { salida += chunk; });
    const fin = new Promise(resolve => admin.on('close', resolve));
    await new Promise(resolve => admin.stdin.end(`begin; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
      select public.guardar_disponibilidad_semanal((select jsonb_agg(jsonb_build_object('dia', dia, 'hora', hora)) from private.disponibilidad_semanal where not (dia = 1 and hora = 7)), false);
      select pg_sleep(4); commit;`, resolve));
    let bloqueada = false;
    for (let intento = 0; intento < 30; intento++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (query("select exists (select 1 from pg_locks where locktype = 'advisory' and objid = 87194531 and granted and database = (select oid from pg_database where datname = current_database()));").trim() === 't') { bloqueada = true; break; }
    }
    assert.ok(bloqueada, 'La transacción administrativa no obtuvo el bloqueo');
    assert.throws(() => query(`set role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
      insert into public.citas (inicio, servicio) values (${inicio}, 'Espalda');`), /Horario no disponible|row-level security/);
    assert.equal(await fin, 0, salida);
    assert.equal(query('select count(*) from public.citas;').trim(), '0');
    assert.equal(query('select count(*) from private.disponibilidad_semanal where dia = 1 and hora = 7;').trim(), '0');

    query('insert into private.disponibilidad_semanal values (1, 7);');
    const reserva = spawn('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-At'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let salidaReserva = '';
    reserva.stdout.on('data', chunk => { salidaReserva += chunk; });
    reserva.stderr.on('data', chunk => { salidaReserva += chunk; });
    const finReserva = new Promise(resolve => reserva.on('close', resolve));
    await new Promise(resolve => reserva.stdin.end(`begin; set role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
      insert into public.citas (inicio, servicio) values (${inicio}, 'Espalda'); select pg_sleep(4); commit;`, resolve));
    bloqueada = false;
    for (let intento = 0; intento < 30; intento++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (query("select exists (select 1 from pg_locks where locktype = 'advisory' and objid = 87194531 and granted and database = (select oid from pg_database where datname = current_database()));").trim() === 't') { bloqueada = true; break; }
    }
    assert.ok(bloqueada, 'La reserva no obtuvo el bloqueo');
    const resultado = query(`select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
      select public.guardar_disponibilidad_semanal((select jsonb_agg(jsonb_build_object('dia', dia, 'hora', hora)) from private.disponibilidad_semanal where not (dia = 1 and hora = 7)), false);`);
    assert.match(resultado, /confirmacion/);
    assert.equal(await finReserva, 0, salidaReserva);
    assert.equal(query('select estado from public.citas;').trim(), 'pendiente');
    assert.equal(query('select count(*) from private.disponibilidad_semanal where dia = 1 and hora = 7;').trim(), '1');

    query("insert into public.citas (cliente_id, inicio, servicio, estado) values ('00000000-0000-0000-0000-000000000002', now() + interval '24 hours 2 seconds', 'Espalda', 'confirmada');");
    const espera = spawn('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-At'], { stdio: ['pipe', 'pipe', 'pipe'] });
    const finEspera = new Promise(resolve => espera.on('close', resolve));
    await new Promise(resolve => espera.stdin.end('begin; select pg_advisory_xact_lock(87194531); select pg_sleep(4); commit;', resolve));
    bloqueada = false;
    for (let intento = 0; intento < 30; intento++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (query("select exists (select 1 from pg_locks where locktype = 'advisory' and objid = 87194531 and granted and database = (select oid from pg_database where datname = current_database()));").trim() === 't') { bloqueada = true; break; }
    }
    assert.ok(bloqueada, 'No se obtuvo el bloqueo de espera');
    const vencimiento = query(`select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
      select public.guardar_disponibilidad_semanal((select jsonb_agg(jsonb_build_object('dia', d.dia, 'hora', d.hora)) from private.disponibilidad_semanal d
        where not exists (select 1 from public.citas c where c.estado = 'confirmada'
          and d.dia = extract(isodow from timezone('America/Montevideo', c.inicio))
          and d.hora = extract(hour from timezone('America/Montevideo', c.inicio)))), false);`);
    assert.match(vencimiento, /dentro_del_plazo/);
    assert.equal(await finEspera, 0);
    assert.equal(query("select estado from public.citas where estado = 'confirmada';").trim(), 'confirmada');

    query('delete from public.citas;');
    query(readFileSync('supabase/migrations/20261111201422_bloquear_fechas_horarios.sql', 'utf8'));
    const fecha = query("select (date_trunc('week', timezone('America/Montevideo', now()))::date + 21)::text;").trim();
    const bloqueo = spawn('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-At'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let salidaBloqueo = '';
    bloqueo.stdout.on('data', chunk => { salidaBloqueo += chunk; });
    bloqueo.stderr.on('data', chunk => { salidaBloqueo += chunk; });
    const finBloqueo = new Promise(resolve => bloqueo.on('close', resolve));
    await new Promise(resolve => bloqueo.stdin.end(`begin; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
      select public.guardar_bloqueo('${fecha}', 7, 8, false, null); select pg_sleep(4); commit;`, resolve));
    bloqueada = false;
    for (let intento = 0; intento < 30; intento++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (query("select exists (select 1 from pg_locks where locktype = 'advisory' and objid = 87194531 and granted and database = (select oid from pg_database where datname = current_database()));").trim() === 't') { bloqueada = true; break; }
    }
    assert.ok(bloqueada, 'El bloqueo de fecha no obtuvo el bloqueo transaccional');
    assert.throws(() => query(`set role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
      insert into public.citas (inicio, servicio) values (${inicio}, 'Espalda');`), /Horario no disponible|row-level security/);
    assert.equal(await finBloqueo, 0, salidaBloqueo);
    assert.equal(query('select count(*) from public.citas;').trim(), '0');
    assert.equal(query('select count(*) from private.bloqueos;').trim(), '1');

    query('delete from private.bloqueos;');
    const reservaAntes = spawn('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-At'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let salidaAntes = '';
    reservaAntes.stdout.on('data', chunk => { salidaAntes += chunk; });
    reservaAntes.stderr.on('data', chunk => { salidaAntes += chunk; });
    const finAntes = new Promise(resolve => reservaAntes.on('close', resolve));
    await new Promise(resolve => reservaAntes.stdin.end(`begin; set role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
      insert into public.citas (inicio, servicio) values (${inicio}, 'Espalda'); select pg_sleep(4); commit;`, resolve));
    bloqueada = false;
    for (let intento = 0; intento < 30; intento++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (query("select exists (select 1 from pg_locks where locktype = 'advisory' and objid = 87194531 and granted and database = (select oid from pg_database where datname = current_database()));").trim() === 't') { bloqueada = true; break; }
    }
    assert.ok(bloqueada, 'La reserva no obtuvo el bloqueo transaccional');
    const confirmarBloqueo = query(`select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
      select public.guardar_bloqueo('${fecha}', 7, 8, false, null);`);
    assert.match(confirmarBloqueo, /confirmacion/);
    assert.equal(await finAntes, 0, salidaAntes);
    assert.equal(query('select estado from public.citas;').trim(), 'pendiente');
    assert.equal(query('select count(*) from private.bloqueos;').trim(), '0');

    query("delete from public.citas; delete from private.bloqueos; alter table public.citas add constraint citas_servicio_check check (servicio in ('Masaje deportivo', 'Cuerpo entero', 'Espalda'));");
    query(readFileSync('supabase/migrations/20261111202637_catalogo_servicios.sql', 'utf8'));
    const renombrar = spawn('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-At'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let salidaRenombrar = '';
    renombrar.stdout.on('data', chunk => { salidaRenombrar += chunk; });
    renombrar.stderr.on('data', chunk => { salidaRenombrar += chunk; });
    const finRenombrar = new Promise(resolve => renombrar.on('close', resolve));
    await new Promise(resolve => renombrar.stdin.end(`begin; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
      select public.renombrar_servicio((select id from private.servicios where nombre = 'Espalda'), 'Espalda nueva'); select pg_sleep(4); commit;`, resolve));
    bloqueada = false;
    for (let intento = 0; intento < 30; intento++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (query("select exists (select 1 from pg_locks where locktype = 'advisory' and objid = 87194531 and granted and database = (select oid from pg_database where datname = current_database()));").trim() === 't') { bloqueada = true; break; }
    }
    assert.ok(bloqueada, 'El renombrado no obtuvo el bloqueo transaccional');
    assert.throws(() => query(`set role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
      insert into public.citas (inicio, servicio) values (${inicio}, 'Espalda');`), /Servicio no disponible/);
    assert.equal(await finRenombrar, 0, salidaRenombrar);
    assert.equal(query('select count(*) from public.citas;').trim(), '0');
    query("update private.servicios set nombre = 'Espalda' where nombre = 'Espalda nueva';");

    const reservaServicio = spawn('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-At'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let salidaServicio = '';
    reservaServicio.stdout.on('data', chunk => { salidaServicio += chunk; });
    reservaServicio.stderr.on('data', chunk => { salidaServicio += chunk; });
    const finServicio = new Promise(resolve => reservaServicio.on('close', resolve));
    await new Promise(resolve => reservaServicio.stdin.end(`begin; set role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
      insert into public.citas (inicio, servicio) values (${inicio}, 'Espalda'); select pg_sleep(4); commit;`, resolve));
    bloqueada = false;
    for (let intento = 0; intento < 30; intento++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (query("select exists (select 1 from pg_locks where locktype = 'advisory' and objid = 87194531 and granted and database = (select oid from pg_database where datname = current_database()));").trim() === 't') { bloqueada = true; break; }
    }
    assert.ok(bloqueada, 'La reserva no obtuvo el bloqueo transaccional');
    const resultadoRenombrar = query(`select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
      select public.renombrar_servicio((select id from private.servicios where nombre = 'Espalda'), 'Espalda nueva');`);
    assert.match(resultadoRenombrar, /actualizado/);
    assert.equal(await finServicio, 0, salidaServicio);
    assert.equal(query('select servicio from public.citas;').trim(), 'Espalda nueva');

    query("delete from public.citas; update private.servicios set nombre = 'Espalda' where nombre = 'Espalda nueva';");
    query(readFileSync('supabase/migrations/20261112115835_bloquear_borrar_servicios.sql', 'utf8'));
    const bloqueoServicio = spawn('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-At'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let salidaBloqueoServicio = '';
    bloqueoServicio.stdout.on('data', chunk => { salidaBloqueoServicio += chunk; });
    bloqueoServicio.stderr.on('data', chunk => { salidaBloqueoServicio += chunk; });
    const finBloqueoServicio = new Promise(resolve => bloqueoServicio.on('close', resolve));
    await new Promise(resolve => bloqueoServicio.stdin.end(`begin; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
      select public.bloquear_servicio((select id from private.servicios where nombre = 'Espalda')); select pg_sleep(3); commit;`, resolve));
    bloqueada = false;
    for (let intento = 0; intento < 30; intento++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (query("select exists (select 1 from pg_locks where locktype = 'advisory' and objid = 87194531 and granted and database = (select oid from pg_database where datname = current_database()));").trim() === 't') { bloqueada = true; break; }
    }
    assert.ok(bloqueada, 'El bloqueo del servicio no obtuvo el bloqueo transaccional');
    assert.throws(() => query(`set role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
      insert into public.citas (inicio, servicio) values (${inicio}, 'Espalda');`), /Servicio no disponible/);
    assert.equal(await finBloqueoServicio, 0, salidaBloqueoServicio);
    assert.equal(query('select count(*) from public.citas;').trim(), '0');
    query("update private.servicios set bloqueado = false where nombre = 'Espalda';");

    const reservaAntesDeBorrar = spawn('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-At'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let salidaReservaAntesDeBorrar = '';
    reservaAntesDeBorrar.stdout.on('data', chunk => { salidaReservaAntesDeBorrar += chunk; });
    reservaAntesDeBorrar.stderr.on('data', chunk => { salidaReservaAntesDeBorrar += chunk; });
    const finReservaAntesDeBorrar = new Promise(resolve => reservaAntesDeBorrar.on('close', resolve));
    await new Promise(resolve => reservaAntesDeBorrar.stdin.end(`begin; set role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
      insert into public.citas (inicio, servicio) values (${inicio}, 'Espalda'); select pg_sleep(3); commit;`, resolve));
    bloqueada = false;
    for (let intento = 0; intento < 30; intento++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (query("select exists (select 1 from pg_locks where locktype = 'advisory' and objid = 87194531 and granted and database = (select oid from pg_database where datname = current_database()));").trim() === 't') { bloqueada = true; break; }
    }
    assert.ok(bloqueada, 'La reserva previa al borrado no obtuvo el bloqueo');
    const borrarConReserva = query(`select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
      select public.borrar_servicio((select id from private.servicios where nombre = 'Espalda'));`);
    assert.match(borrarConReserva, /tiene_citas/);
    assert.equal(await finReservaAntesDeBorrar, 0, salidaReservaAntesDeBorrar);
    assert.equal(query("select count(*) from private.servicios where nombre = 'Espalda';").trim(), '1');
    assert.equal(query("select estado from public.citas;").trim(), 'pendiente');

    query('delete from public.citas;');
    const borrarAntes = spawn('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-At'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let salidaBorrarAntes = '';
    borrarAntes.stdout.on('data', chunk => { salidaBorrarAntes += chunk; });
    borrarAntes.stderr.on('data', chunk => { salidaBorrarAntes += chunk; });
    const finBorrarAntes = new Promise(resolve => borrarAntes.on('close', resolve));
    await new Promise(resolve => borrarAntes.stdin.end(`begin; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
      select public.borrar_servicio((select id from private.servicios where nombre = 'Espalda')); select pg_sleep(3); commit;`, resolve));
    bloqueada = false;
    for (let intento = 0; intento < 30; intento++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (query("select exists (select 1 from pg_locks where locktype = 'advisory' and objid = 87194531 and granted and database = (select oid from pg_database where datname = current_database()));").trim() === 't') { bloqueada = true; break; }
    }
    assert.ok(bloqueada, 'El borrado no obtuvo el bloqueo transaccional');
    assert.throws(() => query(`set role authenticated; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
      insert into public.citas (inicio, servicio) values (${inicio}, 'Espalda');`), /Servicio no disponible/);
    assert.equal(await finBorrarAntes, 0, salidaBorrarAntes);
    assert.equal(query('select count(*) from public.citas;').trim(), '0');
    assert.equal(query("select count(*) from private.servicios where nombre = 'Espalda';").trim(), '0');
  } finally {
    docker('dropdb', '-U', 'postgres', '--force', db);
  }
});
