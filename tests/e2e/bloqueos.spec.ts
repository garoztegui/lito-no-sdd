import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

test('el administrador bloquea y libera un horario en la agenda', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const email = `story10-${crypto.randomUUID()}@example.test`;
  const sql = (consulta: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', consulta], { encoding: 'utf8' }).trim();
  const fecha = sql(`select dia from (select (timezone('America/Montevideo', now())::date + n) dia from generate_series(35,80) n) d
    where extract(isodow from dia) between 1 and 5
    and private.inicio_disponible((dia::timestamp + interval '12 hours') at time zone 'America/Montevideo')
    and not exists (select 1 from public.citas c where timezone('America/Montevideo', c.inicio)::date = dia
      and extract(hour from timezone('America/Montevideo', c.inicio)) = 12 and c.estado in ('pendiente','confirmada','propuesta')) limit 1`);
  expect(fecha).not.toBe('');
  let idBloqueo = '';
  try {
    await page.goto('/');
    const registro = page.getByRole('form', { name: 'Registro' });
    await registro.getByLabel('Nombre completo').fill('Administrador Ejemplo');
    await registro.getByLabel('Email').fill(email);
    await registro.getByLabel('Teléfono').fill('099123456');
    await registro.getByLabel('Contraseña').fill('ClaveSegura123');
    await registro.getByRole('button', { name: 'Registrarse' }).click();
    await expect(registro.getByText('Cuenta creada.')).toBeVisible();
    sql(`update public.perfiles set es_administrador = true where id = (select id from auth.users where email = '${email}')`);
    await page.goto('/agenda-admin?seccion=bloqueos');
    const bloqueos = page.getByRole('region', { name: 'Bloqueos de horarios' });
    await bloqueos.getByLabel('Fecha del bloqueo').fill(fecha);
    await bloqueos.getByLabel('Todo el día').uncheck();
    await bloqueos.getByLabel('Desde').selectOption('12');
    await bloqueos.getByLabel('Hasta').selectOption('13');
    await bloqueos.getByRole('button', { name: 'Bloquear horario' }).focus();
    await page.keyboard.press('Enter');
    await expect(bloqueos.getByRole('status')).toHaveText('Bloqueo guardado.');
    idBloqueo = sql(`select id from private.bloqueos where fecha = '${fecha}' and hora_inicio = 12 and hora_fin = 13`);
    expect(idBloqueo).toMatch(/^[0-9a-f-]{36}$/);
    await page.goto('/');
    await page.getByLabel('Fecha', { exact: true }).fill(fecha);
    await expect(page.getByRole('button', { name: /^12:00 / })).toHaveCount(0);
    await page.goto('/agenda-admin?seccion=bloqueos');
    const fila = page.getByRole('listitem').filter({ has: page.locator(`time[datetime="${fecha}"]`) }).filter({ hasText: '12:00 a 13:00' });
    await fila.getByRole('button', { name: /Eliminar bloqueo/ }).click();
    await expect(page.getByText('Bloqueo eliminado.')).toBeVisible();
    await page.goto('/');
    await page.getByLabel('Fecha', { exact: true }).fill(fecha);
    await expect(page.getByRole('button', { name: '12:00 Disponible' })).toBeVisible();
  } finally {
    if (/^[0-9a-f-]{36}$/.test(idBloqueo)) sql(`delete from private.bloqueos where id = '${idBloqueo}'`);
    sql(`delete from auth.users where email = '${email}'`);
  }
});

test('el administrador decide sobre las citas afectadas antes de bloquear', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const email = `story10-confirmacion-${crypto.randomUUID()}@example.test`;
  const sql = (consulta: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', consulta], { encoding: 'utf8' }).trim();
  const fecha = sql(`select dia from (select (timezone('America/Montevideo', now())::date + n) dia from generate_series(35,80) n) d
    where extract(isodow from dia) between 1 and 5
    and private.inicio_disponible((dia::timestamp + interval '12 hours') at time zone 'America/Montevideo')
    and not exists (select 1 from public.citas c where timezone('America/Montevideo', c.inicio)::date = dia
      and extract(hour from timezone('America/Montevideo', c.inicio)) = 12 and c.estado in ('pendiente','confirmada','propuesta')) limit 1`);
  expect(fecha).not.toBe('');
  let citaId = '';
  let bloqueoId = '';
  try {
    await page.goto('/');
    const registro = page.getByRole('form', { name: 'Registro' });
    await registro.getByLabel('Nombre completo').fill('Administrador Ejemplo');
    await registro.getByLabel('Email').fill(email);
    await registro.getByLabel('Teléfono').fill('099123456');
    await registro.getByLabel('Contraseña').fill('ClaveSegura123');
    await registro.getByRole('button', { name: 'Registrarse' }).click();
    await expect(registro.getByText('Cuenta creada.')).toBeVisible();
    sql(`update public.perfiles set es_administrador = true where id = (select id from auth.users where email = '${email}')`);
    citaId = sql(`insert into public.citas (cliente_id, inicio, servicio, estado) select id, ('${fecha}'::date::timestamp + interval '12 hours') at time zone 'America/Montevideo', 'Espalda', 'pendiente' from auth.users where email = '${email}' returning id`).split(/\r?\n/)[0];
    expect(citaId).toMatch(/^[0-9a-f-]{36}$/);
    await page.goto('/agenda-admin?seccion=bloqueos');
    const bloqueos = page.getByRole('region', { name: 'Bloqueos de horarios' });
    await bloqueos.getByLabel('Fecha del bloqueo').fill(fecha);
    await bloqueos.getByLabel('Todo el día').uncheck();
    await bloqueos.getByLabel('Desde').selectOption('12');
    await bloqueos.getByLabel('Hasta').selectOption('13');
    await bloqueos.getByRole('button', { name: 'Bloquear horario' }).click();
    await expect(page.getByRole('dialog')).toContainText('1 citas afectadas');
    await page.getByRole('dialog').getByRole('button', { name: 'No', exact: true }).click();
    await expect(bloqueos.getByText('No se realizaron cambios.')).toBeVisible();
    expect(sql(`select estado from public.citas where id = '${citaId}'`)).toBe('pendiente');
    expect(sql(`select count(*) from private.bloqueos where fecha = '${fecha}' and hora_inicio = 12 and hora_fin = 13`)).toBe('0');
    await bloqueos.getByRole('button', { name: 'Bloquear horario' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sí', exact: true }).click();
    await expect(bloqueos.getByText('Bloqueo guardado.')).toBeVisible();
    expect(sql(`select estado from public.citas where id = '${citaId}'`)).toBe('cancelada');
    bloqueoId = sql(`select id from private.bloqueos where fecha = '${fecha}' and hora_inicio = 12 and hora_fin = 13`);
    expect(bloqueoId).toMatch(/^[0-9a-f-]{36}$/);
    sql(`update public.citas set estado = 'confirmada', inicio = now() + interval '2 hours 17 seconds' where id = '${citaId}'`);
    const fechaCercana = sql(`select timezone('America/Montevideo', inicio)::date from public.citas where id = '${citaId}'`);
    const cantidadAntes = sql(`select count(*) from private.bloqueos where fecha = '${fechaCercana}'`);
    await bloqueos.getByLabel('Fecha del bloqueo').fill(fechaCercana);
    await bloqueos.getByLabel('Todo el día').check();
    await bloqueos.getByRole('button', { name: 'Bloquear horario' }).click();
    await expect(bloqueos.getByText('No se puede bloquear: hay citas afectadas dentro de las próximas 24 horas.')).toBeVisible();
    expect(sql(`select estado from public.citas where id = '${citaId}'`)).toBe('confirmada');
    expect(sql(`select count(*) from private.bloqueos where fecha = '${fechaCercana}'`)).toBe(cantidadAntes);
  } finally {
    if (/^[0-9a-f-]{36}$/.test(bloqueoId)) sql(`delete from private.bloqueos where id = '${bloqueoId}'`);
    if (/^[0-9a-f-]{36}$/.test(citaId)) sql(`delete from public.citas where id = '${citaId}'`);
    sql(`delete from auth.users where email = '${email}'`);
  }
});
