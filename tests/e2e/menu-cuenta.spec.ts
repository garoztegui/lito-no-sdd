import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

test('el administrador edita su cuenta y cierra sesión desde la barra', async ({ page, context }) => {
  const email = `cuenta-admin-${crypto.randomUUID()}@example.test`;
  const sql = (consulta: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', consulta], { encoding: 'utf8' }).trim();
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const registro = page.getByRole('form', { name: 'Registro' });
    await registro.getByLabel('Nombre completo').fill('Admin Prueba');
    await registro.getByLabel('Email').fill(email);
    await registro.getByLabel('Teléfono').fill('099123456');
    await registro.getByLabel('Contraseña').fill('ClaveSegura123');
    await registro.getByRole('button', { name: 'Registrarse' }).click();
    await expect(registro.getByText('Cuenta creada.')).toBeVisible();
    sql(`update public.perfiles set es_administrador=true where id=(select id from auth.users where email='${email}')`);
    await page.reload();
    await expect(page.getByRole('link', { name: 'Ver agenda' })).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 800 });
    const agenda = await page.getByRole('link', { name: 'Ver agenda' }).boundingBox();
    const usuarios = await page.getByRole('link', { name: 'Listado de usuarios' }).boundingBox();
    expect(usuarios!.y).toBeGreaterThan(agenda!.y);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByText('Admin Prueba', { exact: true }).click();
    await page.getByRole('link', { name: 'Configuración' }).click();
    await expect(page.getByLabel('Email de la cuenta')).toHaveValue(email);
    await page.getByLabel('Nombre completo').fill('Admin Actualizado');
    await page.getByLabel('Teléfono').fill('099222333');
    await page.getByLabel('Sexo').selectOption('Mujer');
    await page.getByRole('button', { name: 'Guardar datos' }).click();
    await expect(page.getByText('Datos actualizados.')).toBeVisible();
    await expect(page.getByText('Admin Actualizado', { exact: true })).toBeVisible();
    await page.goto('/agenda-admin?seccion=agenda');
    const otra = await context.newPage();
    await otra.goto('/agenda-admin?seccion=agenda');
    await expect(otra.getByRole('heading', { name: 'Agenda administrativa' })).toBeVisible();
    await page.getByText('Admin Actualizado', { exact: true }).click();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('form', { name: 'Iniciar sesión' })).toBeVisible();
    await expect(otra.getByRole('form', { name: 'Iniciar sesión' })).toBeVisible();
  } finally {
    sql(`delete from auth.users where email='${email}'`);
  }
});
