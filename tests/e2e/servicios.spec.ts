import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

test('el administrador crea y renombra un servicio disponible para reservas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const sufijo = crypto.randomUUID();
  const email = `story11-${sufijo}@example.test`;
  const nombre = `Servicio ${sufijo}`;
  const nuevoNombre = `Sesión ${sufijo}`;
  const sql = (consulta: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', consulta], { encoding: 'utf8' }).trim();
  let servicioId = '';
  try {
    await page.goto('/');
    await page.getByRole('link', { name: 'Crear cuenta.' }).click();
    const registro = page.getByRole('form', { name: 'Registro' });
    await registro.getByLabel('Nombre completo').fill('Administrador Ejemplo');
    await registro.getByLabel('Email').fill(email);
    await registro.getByLabel('Teléfono').fill('099123456');
    await registro.getByLabel('Contraseña').fill('ClaveSegura123');
    await registro.getByRole('button', { name: 'CREAR' }).click();
    await expect(registro).toBeHidden();
    sql(`update public.perfiles set es_administrador = true where id = (select id from auth.users where email = '${email}')`);
    await page.goto('/agenda-admin?seccion=servicios');
    const catalogo = page.getByRole('region', { name: 'Catálogo de servicios' });
    await catalogo.getByLabel('Nombre del nuevo servicio').fill(nombre);
    await catalogo.getByRole('button', { name: 'Crear servicio' }).focus();
    await page.keyboard.press('Enter');
    await expect(catalogo.getByText('Servicio creado.')).toBeVisible();
    servicioId = sql(`select id from private.servicios where nombre = '${nombre}'`);
    expect(servicioId).toMatch(/^[0-9a-f-]{36}$/);
    await catalogo.getByLabel('Nombre del nuevo servicio').fill(nombre);
    await catalogo.getByRole('button', { name: 'Crear servicio' }).click();
    await expect(catalogo.getByText('Ya existe un servicio con ese nombre.')).toBeVisible();
    sql(`insert into public.citas (cliente_id, inicio, servicio, estado) select id, now() - interval '1 day', '${nombre}', 'confirmada' from auth.users where email = '${email}'`);
    sql(`insert into public.citas (cliente_id, inicio, servicio, estado) select id, now() + interval '301 days', '${nombre}', 'pendiente' from auth.users where email = '${email}'`);
    await catalogo.getByLabel('Seleccionar servicio').selectOption({ label: nombre });
    await catalogo.getByRole('button', { name: 'Cambiar nombre' }).click();
    const modal = page.getByRole('dialog', { name: 'Cambiar nombre' });
    await modal.getByLabel('Nombre del servicio').fill('   ');
    await modal.getByRole('button', { name: 'Guardar' }).click();
    await expect(modal.getByRole('alert')).toContainText('Ingresá un nombre');
    await modal.getByLabel('Nombre del servicio').fill('Espalda');
    await modal.getByRole('button', { name: 'Guardar' }).click();
    await expect(modal.getByRole('alert')).toContainText('Ya existe un servicio con ese nombre.');
    await modal.getByRole('button', { name: 'Cancelar' }).click();
    await catalogo.getByRole('button', { name: 'Cambiar nombre' }).click();
    await modal.getByLabel('Nombre del servicio').fill(nuevoNombre);
    await modal.getByRole('button', { name: 'Guardar' }).click();
    await expect(catalogo.getByText('Servicio actualizado.')).toBeVisible();
    expect(sql(`select count(*) from public.citas where cliente_id = (select id from auth.users where email = '${email}') and inicio < now() and servicio = '${nombre}'`)).toBe('1');
    expect(sql(`select count(*) from public.citas where cliente_id = (select id from auth.users where email = '${email}') and inicio > now() and servicio = '${nuevoNombre}'`)).toBe('1');
    await expect(catalogo.getByLabel('Seleccionar servicio').getByRole('option', { name: nuevoNombre })).toBeAttached();
  } finally {
    sql(`delete from public.citas where cliente_id = (select id from auth.users where email = '${email}')`);
    if (/^[0-9a-f-]{36}$/.test(servicioId)) sql(`delete from private.servicios where id = '${servicioId}'`);
    sql(`delete from auth.users where email = '${email}'`);
  }
});
