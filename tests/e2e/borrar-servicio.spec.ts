import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

test('confirma el borrado y muestra el motivo cuando hay citas futuras', async ({ page }) => {
  const id = crypto.randomUUID();
  const email = `borrar-${id}@example.test`;
  const nombre = `Servicio de prueba ${id}`;
  const sql = (consulta: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', consulta], { encoding: 'utf8' }).trim();
  let servicioId = '';
  try {
    await page.goto('/');
    await page.getByRole('link', { name: 'CREAR UNA' }).click();
    const registro = page.getByRole('form', { name: 'Registro' });
    await registro.getByLabel('Nombre completo').fill('Administrador Ejemplo');
    await registro.getByLabel('Email').fill(email);
    await registro.getByLabel('Teléfono').fill('099123456');
    await registro.getByLabel('Contraseña').fill('ClaveSegura123');
    await registro.getByRole('button', { name: 'CREAR' }).click();
    await expect(registro).toBeHidden();
    sql(`update public.perfiles set es_administrador = true where id = (select id from auth.users where email = '${email}')`);
    await page.goto('/agenda-admin?seccion=servicios');
    await page.getByLabel('Nombre del nuevo servicio').fill(nombre);
    await page.getByRole('button', { name: 'Crear servicio' }).click();
    const fila = page.getByRole('listitem').filter({ hasText: nombre });
    await expect(fila).toBeVisible();
    servicioId = sql(`select id from private.servicios where nombre = '${nombre}'`);
    const borrar = fila.getByRole('button', { name: `Borrar servicio ${nombre}` });
    const dialogo = page.getByRole('dialog', { name: 'Confirmar eliminación' });
    await borrar.click();
    await dialogo.getByRole('button', { name: 'No', exact: true }).click();
    expect(sql(`select count(*) from private.servicios where id = '${servicioId}'`)).toBe('1');
    sql(`insert into public.citas (cliente_id, inicio, servicio, estado) select id, now() + interval '300 days', '${nombre}', 'pendiente' from auth.users where email = '${email}'`);
    await borrar.click();
    await dialogo.getByRole('button', { name: 'Sí', exact: true }).click();
    await expect(fila.getByRole('status')).toContainText('El servicio tiene citas futuras');
    expect(sql(`select count(*) from private.servicios where id = '${servicioId}'`)).toBe('1');
    sql(`delete from public.citas where cliente_id = (select id from auth.users where email = '${email}')`);
    await borrar.click();
    await dialogo.getByRole('button', { name: 'Sí', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Servicio borrado.' })).toBeVisible();
    await expect(fila).toHaveCount(0);
    expect(sql(`select count(*) from private.servicios where id = '${servicioId}'`)).toBe('0');
  } finally {
    sql(`delete from public.citas where cliente_id = (select id from auth.users where email = '${email}')`);
    if (/^[0-9a-f-]{36}$/.test(servicioId)) sql(`delete from private.servicios where id = '${servicioId}'`);
    sql(`delete from auth.users where email = '${email}'`);
  }
});
