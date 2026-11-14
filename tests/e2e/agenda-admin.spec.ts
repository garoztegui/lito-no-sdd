import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

test('el administrador consulta la agenda y un cliente no puede acceder', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const email = `story4-${crypto.randomUUID()}@example.com`;
  await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Administrador Ejemplo');
  await registro.getByLabel('Email').fill(email);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'CREAR' }).click();
  await expect(registro).toBeHidden();
  await page.goto('/agenda-admin');
  await expect(page.getByText('No tenés acceso a esta agenda.')).toBeVisible();
  const sql = (statement: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', statement]);
  sql(`update public.perfiles set es_administrador = true where id = (select id from auth.users where email = '${email}')`);
  try {
    sql(`insert into public.citas (cliente_id, inicio, servicio, estado) select id, now() + interval '300 days', 'Espalda', 'confirmada' from auth.users where email = '${email}'`);
    await page.goto('/');
    for (const nombre of ['Ver agenda', 'Listado de usuarios', 'Modificar horarios disponibles', 'Bloquear horarios', 'Administrar servicios']) await expect(page.getByRole('link', { name: nombre })).toBeVisible();
    await page.getByText('Administrador Ejemplo', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
    await page.getByText('Administrador Ejemplo', { exact: true }).click();
    await expect(page.getByRole('region', { name: 'Mis citas' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Solicitar una cita' })).toHaveCount(0);
    const perfilRoute = /\/rest\/v1\/perfiles(?:\?|$)/;
    await page.route(perfilRoute, route => route.fulfill({ status: 400, body: '{}' }));
    await page.reload();
    await expect(page.getByText('No se pudo comprobar el acceso a reservas.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Solicitar una cita' })).toHaveCount(0);
    await page.unroute(perfilRoute);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByRole('link', { name: 'Ver agenda' })).toBeVisible();
    await page.reload();
    for (const nombre of ['Ver agenda', 'Listado de usuarios', 'Modificar horarios disponibles', 'Bloquear horarios', 'Administrar servicios']) await expect(page.getByRole('link', { name: nombre })).toBeVisible();
    await page.getByRole('link', { name: 'Ver agenda' }).click();
    await expect(page.getByRole('heading', { name: 'Agenda administrativa' })).toBeVisible();
    const fechaCita = sql(`select to_char(inicio at time zone 'America/Montevideo', 'YYYY-MM-DD') from public.citas where cliente_id = (select id from auth.users where email = '${email}')`).toString().split('\n').map(linea => linea.trim()).find(linea => /^\d{4}-\d{2}-\d{2}$/.test(linea));
    expect(fechaCita).toBeTruthy();
    await page.goto(`/agenda-admin?seccion=agenda&mes=${fechaCita!.slice(0, 7)}&dia=${fechaCita}`);
    const cita = page.getByRole('row').filter({ hasText: 'Administrador Ejemplo' });
    for (const texto of ['Espalda', 'confirmada', 'Administrador Ejemplo']) {
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
  await page.getByRole('link', { name: 'CREAR UNA' }).click();
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Administrador Ejemplo');
  await registro.getByLabel('Email').fill(email);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'CREAR' }).click();
  await expect(registro).toBeHidden();

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
    await page.goto(`/agenda-admin?seccion=agenda&mes=${inicio.toISOString().slice(0, 7)}&dia=${inicio.toISOString().slice(0, 10)}`);
    const cita = page.getByRole('row').filter({ hasText: 'Administrador Ejemplo' }).filter({ hasText: 'pendiente' });
    await cita.getByRole('button', { name: /estado pendiente/ }).click();
    const gestion = page.getByRole('dialog', { name: /Gestionar cita/ });
    await gestion.getByRole('button', { name: 'Proponer otro horario' }).click();
    await gestion.getByLabel('Fecha').fill(horarioOcupado.slice(0, 10));
    await expect(gestion.getByRole('button', { name: '10:00 Ocupado' })).toBeDisabled();
    await gestion.getByLabel('Fecha').fill(fechaPropuesta.slice(0, 10));
    await gestion.getByRole('button', { name: '10:00 Disponible' }).click();
    sql(`insert into public.citas (cliente_id, inicio, servicio, estado) select id, '${fechaPropuesta}', 'Cuerpo entero', 'confirmada' from auth.users where email = '${email}'`);
    await gestion.getByRole('button', { name: 'Confirmar propuesta' }).click();
    await expect(gestion.getByRole('alert')).toHaveText('El horario elegido no está disponible. Elegí otro.');
    await expect(gestion.getByRole('button', { name: '10:00 Ocupado' })).toBeDisabled();
    sql(`delete from public.citas where inicio = '${fechaPropuesta}' and cliente_id = (select id from auth.users where email = '${email}')`);
    await page.reload();
    await gestion.getByLabel('Fecha').fill(fechaPropuesta.slice(0, 10));
    await gestion.getByRole('button', { name: '10:00 Disponible' }).click();
    await gestion.getByRole('button', { name: 'Confirmar propuesta' }).click();
    await expect(page.getByRole('status')).toHaveText('Propuesta de horario registrada.');
    await page.goto(`/agenda-admin?seccion=agenda&mes=${fechaPropuesta.slice(0, 7)}&dia=${fechaPropuesta.slice(0, 10)}`);
    const citaPropuesta = page.getByRole('row').filter({ hasText: 'Administrador Ejemplo' }).filter({ hasText: 'propuesta' });
    await expect(citaPropuesta).toContainText('propuesta');
    const inicioMostrado = await citaPropuesta.locator('time').getAttribute('datetime');
    expect(Date.parse(inicioMostrado ?? '')).toBe(Date.parse(fechaPropuesta));
    await citaPropuesta.getByRole('button', { name: /estado propuesta/ }).click();
    await expect(gestion).toContainText('Esperando respuesta del cliente.');
    await expect(gestion.getByRole('button', { name: 'Aceptar solicitud' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(gestion).toHaveCount(0);

    sql(`update public.perfiles set es_administrador = false where id = (select id from auth.users where email = '${email}')`);
    await page.goto('/');
    await page.getByRole('button', { name: 'Mis citas', exact: true }).click();
    const misCitas = page.getByRole('region', { name: 'Mis citas' });
    const propuestaCliente = misCitas.getByRole('listitem').filter({ hasText: 'Propuesta' });
    await expect(propuestaCliente).toContainText('Espalda');
    await propuestaCliente.getByRole('button', { name: 'Rechazar propuesta' }).click();
    const confirmacion = page.getByRole('dialog', { name: 'Confirmar cancelación' });
    await confirmacion.getByRole('button', { name: 'No', exact: true }).click();
    await expect(propuestaCliente).toContainText('Propuesta');
    await propuestaCliente.getByRole('button', { name: 'Rechazar propuesta' }).click();
    await confirmacion.getByRole('button', { name: 'Sí', exact: true }).click();
    await expect(misCitas.getByRole('status')).toHaveText('La cita quedó cancelada.');
    await expect(misCitas.getByRole('listitem').filter({ hasText: 'Espalda' })).toContainText('Cancelada');
    expect(sql(`select estado from public.citas where inicio = '${fechaPropuesta}' and cliente_id = (select id from auth.users where email = '${email}')`).trim()).toBe('cancelada');

    sql(`insert into public.citas (cliente_id, inicio, servicio, estado) select id, '${inicio.toISOString()}', 'Espalda', 'propuesta' from auth.users where email = '${email}'`);
    await page.reload();
    await page.getByRole('button', { name: 'Mis citas', exact: true }).click();
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
