import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomInt } from 'node:crypto';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function cliente() {
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.auth.signUp({
    email: `prueba-${randomUUID()}@example.com`, password: 'ClaveSegura123',
    options: { data: { nombre: 'Cliente Ejemplo', telefono: '099123456', sexo: 'Mujer' } },
  });
  assert.equal(error, null);
  return supabase;
}

function horarioFuturo() {
  const fecha = new Date(Date.now() + (30 + randomInt(30)) * 86400000);
  while (fecha.getUTCDay() === 0 || fecha.getUTCDay() === 6) fecha.setUTCDate(fecha.getUTCDate() + 1);
  fecha.setUTCHours(10 + randomInt(12), 0, 0, 0);
  return fecha.toISOString();
}

async function horarioLibre(supabase) {
  for (let i = 0; i < 30; i++) {
    const inicio = horarioFuturo();
    const hasta = new Date(Date.parse(inicio) + 3600000).toISOString();
    const { data, error } = await supabase.rpc('horarios_ocupados', { desde: inicio, hasta });
    assert.equal(error, null);
    if (data.length === 0) return inicio;
  }
  throw new Error('No se encontró un horario de prueba libre');
}

test('un cliente puede solicitar una cita pendiente', async () => {
  const supabase = await cliente();
  const inicio = await horarioLibre(supabase);
  const { error } = await supabase.rpc('solicitar_cita', { inicio_cita: inicio, servicio_cita: 'Masaje deportivo' });
  assert.equal(error, null);
  const { data, error: consulta } = await supabase.from('citas').select('inicio,servicio,estado').eq('inicio', inicio);
  assert.equal(consulta, null);
  assert.equal(data.length, 1);
  assert.equal(data[0].servicio, 'Masaje deportivo');
  assert.equal(data[0].estado, 'pendiente');
});

test('la base rechaza horarios fuera de las reglas acordadas', async () => {
  const supabase = await cliente();
  const finDeSemana = new Date(horarioFuturo());
  while (finDeSemana.getUTCDay() !== 6) finDeSemana.setUTCDate(finDeSemana.getUTCDate() + 1);
  const mediaHora = new Date(horarioFuturo());
  mediaHora.setUTCMinutes(30);
  const antesDelHorario = new Date(horarioFuturo());
  antesDelHorario.setUTCHours(9);
  const despuesDelHorario = new Date(horarioFuturo());
  despuesDelHorario.setUTCHours(22);
  const demasiadoPronto = new Date(Date.now() + 60 * 60 * 1000);
  const demasiadoLejos = new Date(Date.now() + 120 * 86400000);
  for (const fecha of [finDeSemana, mediaHora, antesDelHorario, despuesDelHorario, demasiadoPronto, demasiadoLejos]) {
    const { error } = await supabase.rpc('solicitar_cita', {
      inicio_cita: fecha.toISOString(), servicio_cita: 'Espalda',
    });
    assert.notEqual(error, null, `Se aceptó ${fecha.toISOString()}`);
  }
});

test('otro cliente ve el horario ocupado sin acceder a los datos de la cita', async () => {
  const primero = await cliente();
  const segundo = await cliente();
  const inicio = await horarioLibre(primero);
  const creada = await primero.rpc('solicitar_cita', { inicio_cita: inicio, servicio_cita: 'Espalda' });
  assert.equal(creada.error, null);
  const ocupados = await segundo.rpc('horarios_ocupados', { desde: inicio, hasta: new Date(Date.parse(inicio) + 3600000).toISOString() });
  assert.equal(ocupados.error, null);
  assert.equal(ocupados.data.length, 1);
  assert.deepEqual(Object.keys(ocupados.data[0]), ['inicio']);
  const ajenas = await segundo.from('citas').select('*').eq('inicio', inicio);
  assert.deepEqual(ajenas.data, []);
});

test('dos solicitudes simultáneas no pueden ocupar el mismo horario', async () => {
  const primero = await cliente();
  const segundo = await cliente();
  const inicio = await horarioLibre(primero);
  const resultados = await Promise.all([
    primero.rpc('solicitar_cita', { inicio_cita: inicio, servicio_cita: 'Espalda' }),
    segundo.rpc('solicitar_cita', { inicio_cita: inicio, servicio_cita: 'Cuerpo entero' }),
  ]);
  assert.equal(resultados.filter(resultado => !resultado.error).length, 1);
  assert.equal(resultados.filter(resultado => resultado.error?.code === '23505').length, 1);
});

test('solo clientes autenticados pueden reservar y no pueden atribuir citas a otros', async () => {
  const anonimo = createClient(url, key, { auth: { persistSession: false } });
  const { error: sinSesion } = await anonimo.rpc('solicitar_cita', { inicio_cita: horarioFuturo(), servicio_cita: 'Espalda' });
  assert.notEqual(sinSesion, null);
  const primero = await cliente();
  const segundo = await cliente();
  const { data: { user } } = await segundo.auth.getUser();
  const { error } = await primero.from('citas').insert({ inicio: horarioFuturo(), servicio: 'Espalda', cliente_id: user.id });
  assert.notEqual(error, null);
});

test('se permiten dos citas consecutivas de 60 minutos', async () => {
  const supabase = await cliente();
  let inicio;
  let siguiente;
  for (let i = 0; i < 30; i++) {
    inicio = await horarioLibre(supabase);
    const fecha = new Date(inicio);
    fecha.setUTCHours(fecha.getUTCHours() === 21 ? 20 : fecha.getUTCHours() + 1);
    siguiente = fecha.toISOString();
    const { data, error } = await supabase.rpc('horarios_ocupados', { desde: siguiente, hasta: new Date(fecha.getTime() + 3600000).toISOString() });
    assert.equal(error, null);
    if (data.length === 0) break;
    siguiente = undefined;
  }
  assert.ok(inicio && siguiente);
  assert.equal((await supabase.rpc('solicitar_cita', { inicio_cita: inicio, servicio_cita: 'Espalda' })).error, null);
  assert.equal((await supabase.rpc('solicitar_cita', { inicio_cita: siguiente, servicio_cita: 'Espalda' })).error, null);
});

test('cada cliente consulta únicamente sus propias citas', async () => {
  const primero = await cliente();
  const segundo = await cliente();
  const inicioPrimero = await horarioLibre(primero);
  assert.equal((await primero.rpc('solicitar_cita', { inicio_cita: inicioPrimero, servicio_cita: 'Espalda' })).error, null);
  const inicioSegundo = await horarioLibre(segundo);
  assert.equal((await segundo.rpc('solicitar_cita', { inicio_cita: inicioSegundo, servicio_cita: 'Cuerpo entero' })).error, null);
  const citasPrimero = await primero.from('citas').select('inicio,servicio,estado');
  const citasSegundo = await segundo.from('citas').select('inicio,servicio,estado');
  assert.equal(citasPrimero.error, null);
  assert.equal(citasSegundo.error, null);
  assert.equal(citasPrimero.data.length, 1);
  assert.equal(citasSegundo.data.length, 1);
  assert.equal(Date.parse(citasPrimero.data[0].inicio), Date.parse(inicioPrimero));
  assert.equal(Date.parse(citasSegundo.data[0].inicio), Date.parse(inicioSegundo));
  const anonimo = createClient(url, key, { auth: { persistSession: false } });
  const sinSesion = await anonimo.from('citas').select('inicio,servicio,estado');
  assert.ok(sinSesion.error || sinSesion.data.length === 0);
});
