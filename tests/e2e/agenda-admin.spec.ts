import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

test('el administrador consulta la agenda y un cliente no puede acceder', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const email = `story4-${crypto.randomUUID()}@example.com`;
  await page.goto('/');
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Administrador Ejemplo');
  await registro.getByLabel('Email').fill(email);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'Registrarse' }).click();
  await expect(registro.getByText('Cuenta creada.')).toBeVisible();
  await page.goto('/agenda-admin');
  await expect(page.getByText('No tenés acceso a esta agenda.')).toBeVisible();
  const sql = (statement: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', statement]);
  sql(`update public.perfiles set es_administrador = true where id = (select id from auth.users where email = '${email}')`);
  try {
    sql(`insert into public.citas (cliente_id, inicio, servicio, estado) select id, now() + interval '300 days', 'Espalda', 'confirmada' from auth.users where email = '${email}'`);
    await page.goto('/');
    await page.getByRole('link', { name: 'Consultar agenda administrativa' }).click();
    await expect(page.getByRole('heading', { name: 'Agenda administrativa' })).toBeVisible();
    const cita = page.getByRole('listitem').filter({ hasText: email });
    for (const texto of ['Espalda', 'confirmada', 'Administrador Ejemplo', email, '099123456', 'Hombre', 'Montevideo']) {
      await expect(cita).toContainText(texto);
    }
  } finally {
    sql(`delete from public.citas where cliente_id = (select id from auth.users where email = '${email}')`);
    sql(`update public.perfiles set es_administrador = false where id = (select id from auth.users where email = '${email}')`);
  }
});

test('el administrador puede proponer otro horario para una solicitud pendiente', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const email = `story6-${crypto.randomUUID()}@example.com`;
  await page.goto('/');
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Administrador Ejemplo');
  await registro.getByLabel('Email').fill(email);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'Registrarse' }).click();
  await expect(registro.getByText('Cuenta creada.')).toBeVisible();

  const sql = (statement: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', statement], { encoding: 'utf8' });
  const inicio = new Date(Date.now() + 45 * 86400000);
  while (inicio.getUTCDay() === 0 || inicio.getUTCDay() === 6) inicio.setUTCDate(inicio.getUTCDate() + 1);
  inicio.setUTCHours(13, 0, 0, 0);
  let originalDisponible = false;
  for (let intento = 0; intento < 25; intento++) {
    const existe = sql(`select exists (select 1 from public.citas where inicio = '${inicio.toISOString()}' and estado in ('pendiente', 'confirmada', 'propuesta'))`).trim();
    if (existe === 'f') { originalDisponible = true; break; }
    inicio.setUTCDate(inicio.getUTCDate() + 1);
    while (inicio.getUTCDay() === 0 || inicio.getUTCDay() === 6) inicio.setUTCDate(inicio.getUTCDate() + 1);
  }
  expect(originalDisponible).toBe(true);
  const propuesta = new Date(inicio);
  propuesta.setUTCDate(propuesta.getUTCDate() + 1);
  while (propuesta.getUTCDay() === 0 || propuesta.getUTCDay() === 6) propuesta.setUTCDate(propuesta.getUTCDate() + 1);
  let fechaPropuesta = '';
  let disponible = false;
  for (let intento = 0; intento < 25; intento++) {
    fechaPropuesta = propuesta.toISOString();
    const ocupado = sql(`select exists (select 1 from public.citas where inicio = '${fechaPropuesta}' and estado in ('pendiente', 'confirmada', 'propuesta'))`).trim();
    if (ocupado === 'f') { disponible = true; break; }
    propuesta.setUTCDate(propuesta.getUTCDate() + 1);
    while (propuesta.getUTCDay() === 0 || propuesta.getUTCDay() === 6) propuesta.setUTCDate(propuesta.getUTCDate() + 1);
  }
  expect(disponible).toBe(true);
  const ocupado = new Date(propuesta);
  ocupado.setUTCDate(ocupado.getUTCDate() + 1);
  while (ocupado.getUTCDay() === 0 || ocupado.getUTCDay() === 6) ocupado.setUTCDate(ocupado.getUTCDate() + 1);
  let horarioOcupado = '';
  let ocupadoDisponible = false;
  for (let intento = 0; intento < 25; intento++) {
    horarioOcupado = ocupado.toISOString();
    const existe = sql(`select exists (select 1 from public.citas where inicio = '${horarioOcupado}' and estado in ('pendiente', 'confirmada', 'propuesta'))`).trim();
    if (existe === 'f') { ocupadoDisponible = true; break; }
    ocupado.setUTCDate(ocupado.getUTCDate() + 1);
    while (ocupado.getUTCDay() === 0 || ocupado.getUTCDay() === 6) ocupado.setUTCDate(ocupado.getUTCDate() + 1);
  }
  expect(ocupadoDisponible).toBe(true);
  sql(`update public.perfiles set es_administrador = true where id = (select id from auth.users where email = '${email}')`);
  sql(`insert into public.citas (cliente_id, inicio, servicio, estado) select id, '${inicio.toISOString()}', 'Espalda', 'pendiente' from auth.users where email = '${email}'`);
  sql(`insert into public.citas (cliente_id, inicio, servicio, estado) select id, '${horarioOcupado}', 'Cuerpo entero', 'confirmada' from auth.users where email = '${email}'`);

  try {
    await page.goto('/agenda-admin');
    const cita = page.getByRole('listitem').filter({ hasText: email }).filter({ hasText: 'Estado: pendiente' });
    await cita.getByRole('button', { name: 'Proponer otro horario' }).click();
    await cita.getByLabel('Fecha').fill(horarioOcupado.slice(0, 10));
    await expect(cita.getByRole('button', { name: '10:00 Ocupado' })).toBeDisabled();
    await cita.getByLabel('Fecha').fill(fechaPropuesta.slice(0, 10));
    await cita.getByRole('button', { name: '10:00 Disponible' }).click();
    sql(`insert into public.citas (cliente_id, inicio, servicio, estado) select id, '${fechaPropuesta}', 'Cuerpo entero', 'confirmada' from auth.users where email = '${email}'`);
    await cita.getByRole('button', { name: 'Confirmar propuesta' }).click();
    await expect(cita.getByRole('alert')).toHaveText('El horario elegido no está disponible. Elegí otro.');
    await expect(cita.getByRole('button', { name: '10:00 Ocupado' })).toBeDisabled();
    sql(`delete from public.citas where inicio = '${fechaPropuesta}' and cliente_id = (select id from auth.users where email = '${email}')`);
    await page.reload();
    await cita.getByLabel('Fecha').fill(fechaPropuesta.slice(0, 10));
    await cita.getByRole('button', { name: '10:00 Disponible' }).click();
    await cita.getByRole('button', { name: 'Confirmar propuesta' }).click();
    await expect(page.getByRole('status')).toHaveText('Propuesta de horario registrada.');
    const citaPropuesta = page.getByRole('listitem').filter({ hasText: email }).filter({ hasText: 'Estado: propuesta' });
    await expect(citaPropuesta).toContainText('propuesta');
    const inicioMostrado = await citaPropuesta.locator('time').getAttribute('datetime');
    expect(Date.parse(inicioMostrado ?? '')).toBe(Date.parse(fechaPropuesta));

    await page.goto('/');
    const misCitas = page.getByRole('region', { name: 'Mis citas' });
    const propuestaCliente = misCitas.getByRole('listitem').filter({ hasText: 'Propuesta' });
    await expect(propuestaCliente).toContainText('Espalda');
    await propuestaCliente.getByRole('button', { name: 'Rechazar propuesta' }).click();
    await expect(misCitas.getByRole('status')).toHaveText('La cita quedó cancelada.');
    await expect(misCitas.getByRole('listitem').filter({ hasText: 'Espalda' })).toContainText('Cancelada');
    expect(sql(`select estado from public.citas where inicio = '${fechaPropuesta}' and cliente_id = (select id from auth.users where email = '${email}')`).trim()).toBe('cancelada');

    sql(`insert into public.citas (cliente_id, inicio, servicio, estado) select id, '${inicio.toISOString()}', 'Espalda', 'propuesta' from auth.users where email = '${email}'`);
    await page.reload();
    const segundaPropuesta = misCitas.getByRole('listitem').filter({ hasText: 'Propuesta' });
    await segundaPropuesta.getByRole('button', { name: 'Aceptar propuesta' }).focus();
    await page.keyboard.press('Enter');
    await expect(misCitas.getByRole('status')).toHaveText('La cita quedó confirmada.');
    await expect(misCitas.getByRole('listitem').filter({ hasText: 'Confirmada' }).filter({ hasText: 'Espalda' })).toBeVisible();
    expect(sql(`select estado from public.citas where inicio = '${inicio.toISOString()}' and cliente_id = (select id from auth.users where email = '${email}')`).trim()).toBe('confirmada');
  } finally {
    sql(`delete from public.citas where cliente_id = (select id from auth.users where email = '${email}')`);
    sql(`update public.perfiles set es_administrador = false where id = (select id from auth.users where email = '${email}')`);
  }
});
