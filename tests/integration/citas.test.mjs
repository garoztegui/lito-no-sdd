import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomInt } from 'node:crypto';
import { execFileSync } from 'node:child_process';
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

test('proponer un horario disponible libera el anterior y ocupa el nuevo', async () => {
  const supabase = await cliente();
  const { data: { user } } = await supabase.auth.getUser();
  execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c',
    `update public.perfiles set es_administrador = true where id = '${user.id}'`]);

  try {
    const original = await horarioLibre(supabase);
    const creada = await supabase.rpc('solicitar_cita', { inicio_cita: original, servicio_cita: 'Espalda' });
    assert.equal(creada.error, null);
    const { data: cita, error: errorCita } = await supabase.from('citas').select('id').eq('inicio', original).single();
    assert.equal(errorCita, null);

    const propuesta = await horarioLibre(supabase);
    const resultado = await supabase.rpc('proponer_horario_administrador', {
      p_cita_id: cita.id,
      p_nuevo_inicio: propuesta,
    });
    assert.equal(resultado.error, null);

    const originalOcupado = await supabase.rpc('horarios_ocupados', {
      desde: original, hasta: new Date(Date.parse(original) + 3600000).toISOString(),
    });
    const propuestoOcupado = await supabase.rpc('horarios_ocupados', {
      desde: propuesta, hasta: new Date(Date.parse(propuesta) + 3600000).toISOString(),
    });
    assert.equal(originalOcupado.data.length, 0);
    assert.equal(propuestoOcupado.data.length, 1);
  } finally {
    execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c',
      `delete from public.citas where cliente_id = '${user.id}'; delete from auth.users where id = '${user.id}'`]);
  }
});

test('una solicitud vencida se cancela en vez de convertirse en propuesta', async () => {
  const supabase = await cliente();
  const { data: { user } } = await supabase.auth.getUser();
  execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c',
    `update public.perfiles set es_administrador = true where id = '${user.id}'`]);

  try {
    const original = await horarioLibre(supabase);
    assert.equal((await supabase.rpc('solicitar_cita', { inicio_cita: original, servicio_cita: 'Espalda' })).error, null);
    const { data: cita } = await supabase.from('citas').select('id').eq('inicio', original).single();
    const vencimiento = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
    execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c',
      `update public.citas set inicio = '${vencimiento}' where id = '${cita.id}'`]);

    const resultado = await supabase.rpc('proponer_horario_administrador', {
      p_cita_id: cita.id, p_nuevo_inicio: await horarioLibre(supabase),
    });
    assert.equal(resultado.error, null);
    assert.equal(resultado.data, 'cancelada');
    const { data: cancelada } = await supabase.from('citas').select('inicio,estado').eq('id', cita.id).single();
    assert.equal(Date.parse(cancelada.inicio), Date.parse(vencimiento));
    assert.equal(cancelada.estado, 'cancelada');
  } finally {
    execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c',
      `delete from public.citas where cliente_id = '${user.id}'; delete from auth.users where id = '${user.id}'`]);
  }
});

test('una cita resuelta o un horario ocupado no se modifica', async () => {
  const supabase = await cliente();
  const { data: { user } } = await supabase.auth.getUser();
  execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c',
    `update public.perfiles set es_administrador = true where id = '${user.id}'`]);

  try {
    const original = await horarioLibre(supabase);
    assert.equal((await supabase.rpc('solicitar_cita', { inicio_cita: original, servicio_cita: 'Espalda' })).error, null);
    const ocupado = await horarioLibre(supabase);
    assert.equal((await supabase.rpc('solicitar_cita', { inicio_cita: ocupado, servicio_cita: 'Cuerpo entero' })).error, null);
    const { data: cita } = await supabase.from('citas').select('id').eq('inicio', original).single();

    const resultado = await supabase.rpc('proponer_horario_administrador', {
      p_cita_id: cita.id,
      p_nuevo_inicio: ocupado,
    });
    assert.equal(resultado.error, null);
    assert.equal(resultado.data, 'horario_no_disponible');

    const { data: citaSinCambios } = await supabase.from('citas').select('inicio,estado').eq('id', cita.id).single();
    assert.equal(Date.parse(citaSinCambios.inicio), Date.parse(original));
    assert.equal(citaSinCambios.estado, 'pendiente');

    const resolucion = await supabase.rpc('resolver_solicitud_administrador', {
      p_cita_id: cita.id, p_decision: 'aceptar',
    });
    assert.equal(resolucion.data, 'confirmada');
    const segundaPropuesta = await horarioLibre(supabase);
    const propuestaResuelta = await supabase.rpc('proponer_horario_administrador', {
      p_cita_id: cita.id, p_nuevo_inicio: segundaPropuesta,
    });
    assert.equal(propuestaResuelta.data, 'no_pendiente');
    const { data: citaResuelta } = await supabase.from('citas').select('inicio,estado').eq('id', cita.id).single();
    assert.equal(Date.parse(citaResuelta.inicio), Date.parse(original));
    assert.equal(citaResuelta.estado, 'confirmada');
  } finally {
    execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c',
      `delete from public.citas where cliente_id = '${user.id}'; delete from auth.users where id = '${user.id}'`]);
  }
});

test('una propuesta de horario aparece en la agenda administrativa', async () => {
  const supabase = await cliente();
  const { data: { user } } = await supabase.auth.getUser();
  execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c',
    `update public.perfiles set es_administrador = true where id = '${user.id}'`]);

  try {
    const original = await horarioLibre(supabase);
    assert.equal((await supabase.rpc('solicitar_cita', { inicio_cita: original, servicio_cita: 'Espalda' })).error, null);
    const { data: cita } = await supabase.from('citas').select('id').eq('inicio', original).single();
    const propuesta = await horarioLibre(supabase);
    const resultado = await supabase.rpc('proponer_horario_administrador', {
      p_cita_id: cita.id, p_nuevo_inicio: propuesta,
    });
    assert.equal(resultado.data, 'propuesta');

    const agenda = await supabase.rpc('agenda_administrador');
    assert.equal(agenda.error, null);
    const citaPropuesta = agenda.data.find(elemento => elemento.id === cita.id);
    assert.ok(citaPropuesta);
    assert.equal(Date.parse(citaPropuesta.inicio), Date.parse(propuesta));
    assert.equal(citaPropuesta.estado, 'propuesta');
  } finally {
    execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c',
      `delete from public.citas where cliente_id = '${user.id}'; delete from auth.users where id = '${user.id}'`]);
  }
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

test('solo el cliente puede responder una propuesta vigente y el rechazo libera el horario', async () => {
  const propietario = await cliente();
  const ajeno = await cliente();
  const { data: { user } } = await propietario.auth.getUser();
  const { data: { user: usuarioAjeno } } = await ajeno.auth.getUser();
  try {
    const inicio = await horarioLibre(propietario);
    assert.equal((await propietario.rpc('solicitar_cita', { inicio_cita: inicio, servicio_cita: 'Espalda' })).error, null);
    const { data: cita } = await propietario.from('citas').select('id').eq('inicio', inicio).single();
    execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `update public.citas set estado = 'propuesta' where id = '${cita.id}'`]);
    const intentoAjeno = await ajeno.rpc('responder_propuesta', { p_cita_id: cita.id, p_decision: 'aceptar' });
    assert.notEqual(intentoAjeno.data, 'confirmada');
    const respuesta = await propietario.rpc('responder_propuesta', { p_cita_id: cita.id, p_decision: 'rechazar' });
    assert.equal(respuesta.error, null);
    assert.equal(respuesta.data, 'cancelada');
    const ocupado = await propietario.rpc('horarios_ocupados', { desde: inicio, hasta: new Date(Date.parse(inicio) + 3600000).toISOString() });
    assert.equal(ocupado.data.length, 0);
    assert.equal((await propietario.from('citas').select('estado').eq('id', cita.id).single()).data.estado, 'cancelada');
  } finally {
    execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `delete from public.citas where cliente_id = '${user.id}'; delete from auth.users where id in ('${user.id}', '${usuarioAjeno.id}')`]);
  }
});

test('aceptar una propuesta confirma una sola vez y una propuesta vencida se cancela', async () => {
  const supabase = await cliente();
  const { data: { user } } = await supabase.auth.getUser();
  try {
    const inicio = await horarioLibre(supabase);
    assert.equal((await supabase.rpc('solicitar_cita', { inicio_cita: inicio, servicio_cita: 'Espalda' })).error, null);
    const { data: cita } = await supabase.from('citas').select('id').eq('inicio', inicio).single();
    const sql = consulta => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', consulta]);
    sql(`update public.citas set estado = 'propuesta' where id = '${cita.id}'`);
    const respuestas = await Promise.all(['aceptar', 'rechazar'].map(p_decision => supabase.rpc('responder_propuesta', { p_cita_id: cita.id, p_decision })));
    assert.ok(['confirmada,no_vigente', 'cancelada,no_vigente'].includes(respuestas.map(r => r.data).sort().join(',')));
    sql(`update public.citas set estado = 'propuesta', inicio = now() + interval '23 hours' where id = '${cita.id}'`);
    const vencida = await supabase.rpc('responder_propuesta', { p_cita_id: cita.id, p_decision: 'aceptar' });
    assert.ok(['cancelada', 'no_vigente'].includes(vencida.data));
    assert.equal((await supabase.from('citas').select('estado').eq('id', cita.id).single()).data.estado, 'cancelada');
  } finally {
    execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `delete from public.citas where cliente_id = '${user.id}'; delete from auth.users where id = '${user.id}'`]);
  }
});

test('el vencimiento programado cancela propuestas y solicitudes y libera sus horarios', async () => {
  const supabase = await cliente();
  const { data: { user } } = await supabase.auth.getUser();
  try {
    const resultado = execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', `
      begin;
      insert into public.citas (cliente_id, inicio, servicio, estado) values
        ('${user.id}', now() + interval '23 hours', 'Espalda', 'propuesta'),
        ('${user.id}', now() + interval '23 hours 1 second', 'Espalda', 'pendiente');
      select private.expirar_solicitudes_pendientes();
      select count(*) from public.citas where cliente_id = '${user.id}' and estado = 'cancelada';
      select count(*) from public.citas where cliente_id = '${user.id}' and estado in ('pendiente', 'propuesta', 'confirmada');
      select count(*) from cron.job where jobname = 'cancelar-solicitudes-pendientes-vencidas' and active;
      rollback;
    `], { encoding: 'utf8' });
    const lineas = resultado.trim().split(/\r?\n/);
    assert.deepEqual(lineas.slice(-4), ['2', '0', '1', 'ROLLBACK']);
  } finally {
    execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `delete from auth.users where id = '${user.id}'`]);
  }
});

test('el cliente cancela sus citas vigentes sin poder cancelar citas ajenas o confirmadas dentro del límite', async () => {
  const propietario = await cliente();
  const otro = await cliente();
  const { data: { user } } = await propietario.auth.getUser();
  const { data: { user: ajeno } } = await otro.auth.getUser();
  const sql = consulta => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', consulta]);
  try {
    const inicio = await horarioLibre(propietario);
    assert.equal((await propietario.rpc('solicitar_cita', { inicio_cita: inicio, servicio_cita: 'Espalda' })).error, null);
    const { data: cita } = await propietario.from('citas').select('id').eq('inicio', inicio).single();
    const intentoAjeno = await otro.rpc('cancelar_cita_cliente', { p_cita_id: cita.id });
    assert.equal(intentoAjeno.error, null);
    assert.equal(intentoAjeno.data, 'no_disponible');
    assert.equal((await propietario.from('citas').select('estado').eq('id', cita.id).single()).data.estado, 'pendiente');
    assert.equal((await otro.rpc('horarios_ocupados', { desde: inicio, hasta: new Date(Date.parse(inicio) + 3600000).toISOString() })).data.length, 1);
    const cancelada = await propietario.rpc('cancelar_cita_cliente', { p_cita_id: cita.id });
    assert.equal(cancelada.error, null);
    assert.equal(cancelada.data, 'cancelada');
    assert.equal((await propietario.rpc('horarios_ocupados', { desde: inicio, hasta: new Date(Date.parse(inicio) + 3600000).toISOString() })).data.length, 0);
    sql(`update public.citas set estado = 'confirmada' where id = '${cita.id}'`);
    assert.equal((await propietario.rpc('cancelar_cita_cliente', { p_cita_id: cita.id })).data, 'cancelada');
    sql(`update public.citas set estado = 'confirmada', inicio = now() + interval '23 hours' where id = '${cita.id}'`);
    assert.equal((await propietario.rpc('cancelar_cita_cliente', { p_cita_id: cita.id })).data, 'fuera_de_plazo');
    assert.equal((await propietario.from('citas').select('estado').eq('id', cita.id).single()).data.estado, 'confirmada');
  } finally {
    sql(`delete from public.citas where cliente_id in ('${user.id}', '${ajeno.id}'); delete from auth.users where id in ('${user.id}', '${ajeno.id}')`);
  }
});
