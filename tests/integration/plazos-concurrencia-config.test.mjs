import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

test('una reserva que espera un cambio de plazo usa el nuevo valor', { timeout: 60000 }, async () => {
  const base = `test_plazos_${randomBytes(6).toString('hex')}`;
  const docker = (...args) => execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', ...args], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  let admin;
  let cliente;
  let creada = false;
  try {
    docker('createdb', '-U', 'supabase_admin', base);
    creada = true;
    docker('psql', '-U', 'supabase_admin', '-d', base, '-v', 'ON_ERROR_STOP=1', '-c', 'drop schema public');
    const esquema = docker('pg_dump', '-U', 'supabase_admin', '--schema-only', '--no-owner', '-n', 'auth', '-n', 'public', '-n', 'private', 'postgres')
      .replace(/^ALTER DEFAULT PRIVILEGES.*;\r?\n/gm, '');
    execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'supabase_admin', '-d', base, '-v', 'ON_ERROR_STOP=1'], { input: esquema, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    const migracion = readFileSync('supabase/migrations/20261119193932_plazos_config.sql', 'utf8');
    const datos = `${migracion}
insert into auth.users (id,email,raw_user_meta_data,raw_app_meta_data) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','race-admin@example.test','{"nombre":"Admin","telefono":"123","sexo":"Mujer"}','{}'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','race-client@example.test','{"nombre":"Cliente","telefono":"123","sexo":"Mujer"}','{}');
update public.perfiles set es_administrador=true where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
insert into private.servicios(nombre) values ('Espalda');
insert into private.disponibilidad_semanal select d,h from generate_series(1,7) d cross join generate_series(0,23) h;`;
    execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'supabase_admin', '-d', base, '-v', 'ON_ERROR_STOP=1'], { input: datos, encoding: 'utf8' });
    const argumentos = ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'supabase_admin', '-d', base, '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-t'];
    admin = spawn('docker', argumentos, { stdio: ['pipe', 'pipe', 'pipe'] });
    const bloqueo = new Promise((resolve, reject) => {
      let salida = '';
      admin.stdout.on('data', datos => { salida += datos; if (salida.includes('BLOQUEO_LISTO')) resolve(); });
      admin.on('error', reject);
      admin.on('exit', codigo => { if (codigo) reject(new Error(`Administrador finalizó con ${codigo}`)); });
    });
    admin.stdin.write("begin; select pg_advisory_xact_lock(87194531); select 'BLOQUEO_LISTO';\n");
    await bloqueo;
    cliente = spawn('docker', argumentos, { stdio: ['pipe', 'pipe', 'pipe'] });
    let errorCliente = '';
    cliente.stderr.on('data', datos => { errorCliente += datos; });
    const resultadoCliente = new Promise((resolve, reject) => { cliente.on('error', reject); cliente.on('exit', resolve); });
    cliente.stdin.end("begin; set application_name='test_plazos_reserva'; set local role authenticated; select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true); select public.solicitar_cita(date_trunc('hour',clock_timestamp()) + interval '5 hours','Espalda'); rollback;\n");
    let esperando = false;
    for (let i = 0; i < 100 && !esperando; i++) {
      const valor = docker('psql', '-U', 'supabase_admin', '-d', base, '-tAc', "select exists(select 1 from pg_stat_activity where application_name='test_plazos_reserva' and wait_event_type='Lock')").trim();
      esperando = valor === 't';
      if (!esperando) await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(esperando, 'La reserva no llegó a esperar el bloqueo');
    const resultadoAdmin = new Promise((resolve, reject) => { admin.on('error', reject); admin.on('exit', resolve); });
    admin.stdin.end("set local role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true); select public.guardar_plazos(6,12); commit;\n");
    assert.equal(await resultadoAdmin, 0);
    assert.notEqual(await resultadoCliente, 0);
    assert.match(errorCliente, /row-level security policy/);
    assert.equal(docker('psql', '-U', 'supabase_admin', '-d', base, '-tAc', 'select count(*) from public.citas').trim(), '0');
  } finally {
    if (admin && admin.exitCode === null) admin.kill();
    if (cliente && cliente.exitCode === null) cliente.kill();
    if (creada) docker('dropdb', '-U', 'supabase_admin', '--if-exists', base);
  }
});
