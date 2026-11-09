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
