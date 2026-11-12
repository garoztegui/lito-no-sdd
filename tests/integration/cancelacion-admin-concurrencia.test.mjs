import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const contenedor = process.env.STORY15_DB_CONTAINER ?? 'supabase_db_litov2';
const db = `story15_${randomBytes(6).toString('hex')}`;
const admin = '00000000-0000-0000-0000-000000009951';
const cita = '00000000-0000-0000-0000-000000009952';
const ejecutar = (sql, base = db) => execFileSync('docker', ['exec', '-i', contenedor, 'psql', '-U', 'postgres', '-d', base, '-v', 'ON_ERROR_STOP=1', '-t', '-A'], { input: sql, encoding: 'utf8', timeout: 15000 }).trim();

test('el plazo se comprueba después de esperar el bloqueo de la cita', async () => {
  execFileSync('docker', ['exec', contenedor, 'createdb', '-U', 'postgres', db]);
  let bloqueo;
  try {
    ejecutar(`create schema auth; create schema private;
      grant usage on schema auth, private to authenticated;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create table public.perfiles (id uuid primary key, es_administrador boolean not null);
      create table public.citas (id uuid primary key, inicio timestamptz not null, estado text not null);
      insert into public.perfiles values ('${admin}', true);
      insert into public.citas values ('${cita}', clock_timestamp() + interval '24 hours 3 seconds', 'confirmada');`);
    ejecutar(readFileSync('supabase/migrations/20261112123430_cancelacion_administrativa.sql', 'utf8'));
    bloqueo = spawn('docker', ['exec', '-i', contenedor, 'psql', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1'], { stdio: ['pipe', 'ignore', 'pipe'] });
    const terminado = new Promise((resolve, reject) => { bloqueo.on('error', reject); bloqueo.on('exit', code => code === 0 ? resolve() : reject(new Error(`Bloqueo terminó con ${code}`))); });
    await new Promise(resolve => bloqueo.stdin.end(`begin; select id from public.citas where id='${cita}' for update; select pg_sleep(5); commit;`, resolve));
    let adquirido = false;
    for (let i = 0; i < 30 && !adquirido; i++) {
      adquirido = ejecutar("select exists(select 1 from pg_locks where relation='public.citas'::regclass and mode='RowShareLock' and granted)") === 't';
      if (!adquirido) await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.ok(adquirido, 'No se obtuvo el bloqueo de prueba');
    assert.equal(ejecutar(`select inicio > clock_timestamp() + interval '24 hours' from public.citas where id='${cita}'`), 't');
    const resultado = ejecutar(`set role authenticated; select set_config('request.jwt.claim.sub', '${admin}', false); select public.cancelar_cita_administrador('${cita}', 'Motivo');`);
    assert.match(resultado, /fuera_de_plazo/);
    await terminado;
    assert.equal(ejecutar(`select estado || ':' || coalesce(motivo_cancelacion, 'null') from public.citas where id='${cita}'`), 'confirmada:null');
  } finally {
    if (bloqueo && bloqueo.exitCode === null) bloqueo.kill();
    execFileSync('docker', ['exec', contenedor, 'dropdb', '-U', 'postgres', '--force', db]);
  }
});
