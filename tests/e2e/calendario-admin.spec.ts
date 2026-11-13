import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

test('muestra el mes y las reservas de un día en orden de hora', async ({ page }) => {
  const email = `calendario-${crypto.randomUUID()}@example.test`;
  const sql = (consulta: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', consulta], { encoding: 'utf8' }).trim();
  const fecha = new Date(Date.now() + 45 * 86400000);
  while (sql(`select count(*) from public.citas where inicio in (('${fecha.toISOString().slice(0, 10)} 10:00'::timestamp at time zone 'America/Montevideo'), ('${fecha.toISOString().slice(0, 10)} 12:00'::timestamp at time zone 'America/Montevideo')) and estado in ('pendiente','confirmada','propuesta')`) !== '0') fecha.setUTCDate(fecha.getUTCDate() + 1);
  const dia = fecha.toISOString().slice(0, 10);
  const mes = dia.slice(0, 7);
  try {
    await page.goto('/');
    const registro = page.getByRole('form', { name: 'Registro' });
    await registro.getByLabel('Nombre completo').fill('Cliente Calendario');
    await registro.getByLabel('Email').fill(email);
    await registro.getByLabel('Teléfono').fill('099123456');
    await registro.getByLabel('Contraseña').fill('ClaveSegura123');
    await registro.getByRole('button', { name: 'Registrarse' }).click();
    await expect(registro.getByText('Cuenta creada.')).toBeVisible();
    sql(`update public.perfiles set es_administrador=true where id=(select id from auth.users where email='${email}');
      insert into public.citas (cliente_id,inicio,servicio,estado) select id, '${dia} 10:00 America/Montevideo', 'Espalda', 'pendiente' from auth.users where email='${email}';
      insert into public.citas (cliente_id,inicio,servicio,estado) select id, '${dia} 12:00 America/Montevideo', 'Espalda', 'confirmada' from auth.users where email='${email}'`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/agenda-admin?seccion=agenda&mes=${mes}`);
    await expect(page.getByRole('table', { name: 'Reservas del día' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: new RegExp(`${dia}.*con reservas`) })).toBeVisible();
    await expect(page.getByRole('link', { name: /sin reservas/ }).first()).toBeVisible();
    const colorConReservas = await page.getByRole('link', { name: new RegExp(`${dia}.*con reservas`) }).evaluate(elemento => getComputedStyle(elemento).backgroundColor);
    const colorSinReservas = await page.getByRole('link', { name: /sin reservas/ }).first().evaluate(elemento => getComputedStyle(elemento).backgroundColor);
    expect(colorConReservas).not.toBe(colorSinReservas);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'Mes siguiente' }).click();
    await page.getByRole('link', { name: 'Mes anterior' }).click();
    await page.getByRole('link', { name: new RegExp(`${dia}.*con reservas`) }).click();
    const filas = page.getByRole('table', { name: 'Reservas del día' }).getByRole('row').filter({ hasText: email });
    await expect(filas).toHaveCount(2);
    await expect(filas.nth(0)).toContainText('10:00');
    await expect(filas.nth(1)).toContainText('12:00');
    for (const dato of ['Cliente Calendario', email, '099123456', 'Hombre']) await expect(filas.first()).toContainText(dato);
    await expect(filas.first().getByRole('button', { name: 'Aceptar solicitud' })).toBeVisible();
    await expect(filas.first().getByRole('button', { name: 'Proponer otro horario' })).toBeVisible();
    await expect(filas.last().getByRole('button', { name: 'Cancelar cita' })).toBeVisible();
    await filas.last().getByLabel('Motivo de cancelación').fill('Motivo de prueba');
    await filas.last().getByRole('button', { name: 'Cancelar cita' }).click();
    const confirmacion = page.getByRole('dialog', { name: 'Confirmar cancelación' });
    await confirmacion.getByRole('button', { name: 'No', exact: true }).click();
    expect(sql(`select count(*) from public.citas where cliente_id=(select id from auth.users where email='${email}') and estado='confirmada'`)).toBe('1');
    await filas.last().getByRole('button', { name: 'Cancelar cita' }).click();
    await confirmacion.getByRole('button', { name: 'Sí', exact: true }).click();
    await expect(filas).toHaveCount(1);
    expect(sql(`select motivo_cancelacion from public.citas where cliente_id=(select id from auth.users where email='${email}') and estado='cancelada'`)).toBe('Motivo de prueba');
    await filas.first().getByRole('button', { name: 'Aceptar solicitud' }).click();
    await expect(filas.first()).toContainText('confirmada');
    expect(sql(`select count(*) from public.citas where cliente_id=(select id from auth.users where email='${email}') and estado='confirmada'`)).toBe('1');
  } finally {
    sql(`delete from public.citas where cliente_id=(select id from auth.users where email='${email}'); delete from auth.users where email='${email}'`);
  }
});
