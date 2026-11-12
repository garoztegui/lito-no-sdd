import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';

test('el registro conserva la cuenta aunque falle el único intento de bienvenida', async ({ page }) => {
  await page.goto('/');
  const form = page.getByRole('form', { name: 'Registro' });
  await form.getByLabel('Nombre completo').fill('Cliente de Prueba');
  await form.getByLabel('Email').fill(`bienvenida-${crypto.randomUUID()}@example.test`);
  await form.getByLabel('Teléfono').fill('099123456');
  await form.getByLabel('Contraseña').fill('ClaveSegura123');
  const signup = page.waitForResponse(response => response.url().includes('/auth/v1/signup'));
  const envio = page.waitForResponse(response => response.request().method() === 'POST' && !!response.request().headers()['next-action']);
  await form.getByRole('button', { name: 'Registrarse' }).click();
  const usuario = (await (await signup).json()).user;
  expect((await envio).ok()).toBe(true);
  await expect(form.getByText('Cuenta creada.')).toBeVisible();
  expect(usuario.id).toMatch(/^[0-9a-f-]{36}$/);
  const sql = `select count(*) from private.bienvenidas where usuario_id = '${usuario.id}';`;
  const count = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' });
  expect(count.trim()).toBe('1');
});
