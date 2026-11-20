import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';

test('el cliente usa el menú, filtra sus citas y modifica sus datos', async ({ page }) => {
  const email = `config-${crypto.randomUUID()}@example.test`;
  await page.goto('/');
  await page.getByRole('link', { name: 'Crear cuenta.' }).click();
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Cliente Prueba');
  await registro.getByLabel('Email').fill(email);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'CREAR' }).click();
  await expect(registro).toBeHidden();
  await page.reload();
  for (const nombre of ['Mis citas', 'Reservar cita']) await expect(page.getByRole('button', { name: nombre, exact: true })).toBeVisible();
  await page.getByText('Cliente Prueba', { exact: true }).click();
  await page.getByRole('link', { name: 'Configuración' }).click();
  await expect(page.getByLabel('Email de la cuenta')).toHaveValue(email);
  await expect(page.getByLabel('Email de la cuenta')).toBeDisabled();
  await page.getByLabel('Nombre completo').fill('Nombre actualizado');
  await page.getByLabel('Teléfono').fill('099987654');
  await page.getByLabel('Sexo').selectOption('Mujer');
  await page.getByRole('button', { name: 'Guardar datos' }).click();
  await expect(page.getByText('Datos actualizados.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible();
  await expect(page.getByLabel('Nombre completo')).toHaveValue('Nombre actualizado');
  await expect(page.getByLabel('Teléfono')).toHaveValue('099987654');
  await expect(page.getByLabel('Sexo')).toHaveValue('Mujer');
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('NuevaClaveSegura456');
  await page.getByLabel('Confirmar nueva contraseña').fill('NuevaClaveSegura456');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page.getByText('Contraseña guardada. Ya podés ingresar con tu email y contraseña.')).toBeVisible();
  await page.getByRole('button', { name: 'Volver al inicio' }).click();
  await page.route(/\/rest\/v1\/citas(?:\?|$)/, route => route.fulfill({ json: [
    { id: '1', inicio: '2099-01-07T13:00:00Z', servicio: 'Espalda', estado: 'pendiente' },
    { id: '2', inicio: '2099-01-08T13:00:00Z', servicio: 'Cuerpo entero', estado: 'confirmada' },
  ] }));
  await page.getByRole('button', { name: 'Mis citas', exact: true }).click();
  await expect(page.getByRole('listitem')).toHaveCount(2);
  await page.getByLabel('Filtrar por estado').selectOption('confirmada');
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('listitem')).toContainText('Cuerpo entero');
  await page.getByRole('button', { name: 'Volver al menú' }).click();
  await page.getByRole('button', { name: 'Reservar cita' }).click();
  await expect(page.getByRole('heading', { name: 'Solicitar una cita' })).toBeVisible();
  await page.getByText('Nombre actualizado', { exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  const ingreso = page.getByRole('form', { name: 'Iniciar sesión' });
  await ingreso.getByLabel('Email').fill(email);
  await ingreso.getByLabel('Contraseña').fill('ClaveSegura123');
  await ingreso.getByRole('button', { name: 'Ingresar' }).click();
  await expect(ingreso.getByRole('alert')).toHaveText('No se pudo iniciar sesión.');
  await ingreso.getByLabel('Contraseña').fill('NuevaClaveSegura456');
  await ingreso.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByText('Nombre actualizado', { exact: true })).toBeVisible();
});

test('una cuenta de Google puede crear una contraseña sin perder su identidad', async ({ page }) => {
  const email = `google-clave-${crypto.randomUUID()}@example.test`;
  await page.goto('/');
  await page.getByRole('link', { name: 'Crear cuenta.' }).click();
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Cliente Google');
  await registro.getByLabel('Email').fill(email);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveTemporal123');
  await registro.getByRole('button', { name: 'CREAR' }).click();
  await expect(registro).toBeHidden();
  execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
    input: `update auth.users set encrypted_password = null, raw_app_meta_data = '{"provider":"google","providers":["google"]}'::jsonb where email = '${email}'; update auth.identities set provider = 'google' where user_id = (select id from auth.users where email = '${email}');`,
  });
  await page.goto('/configuracion');
  await expect(page.getByRole('heading', { name: 'Crear o cambiar contraseña' })).toBeVisible();
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('corta');
  await page.getByLabel('Confirmar nueva contraseña').fill('corta');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  expect(await page.getByLabel('Nueva contraseña', { exact: true }).evaluate((input: HTMLInputElement) => input.validity.tooShort)).toBe(true);
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('NuevaClaveSegura456');
  await page.getByLabel('Confirmar nueva contraseña').fill('DistintaClave456');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible();
  const sinClave = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-tAc', `select encrypted_password is null from auth.users where email='${email}'`], { encoding: 'utf8' });
  expect(sinClave.trim()).toBe('t');
  await page.getByLabel('Confirmar nueva contraseña').fill('NuevaClaveSegura456');
  await page.route('**/auth/v1/user', async route => {
    if (route.request().method() === 'PUT') await route.fulfill({ status: 422, json: { code: 'weak_password', msg: 'Weak password', weak_password: { reasons: ['pwned'] } } });
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page.getByText('Esa contraseña apareció en filtraciones. Elegí otra.')).toBeVisible();
  await page.unroute('**/auth/v1/user');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page.getByText('Contraseña guardada. Ya podés ingresar con tu email y contraseña.')).toBeVisible();
  const identidad = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-tAc', `select count(*) from auth.identities where provider='google' and user_id=(select id from auth.users where email='${email}')`], { encoding: 'utf8' });
  expect(identidad.trim()).toBe('1');
  await page.getByText('Cliente Google', { exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  const ingreso = page.getByRole('form', { name: 'Iniciar sesión' });
  await ingreso.getByLabel('Email').fill(email);
  await ingreso.getByLabel('Contraseña').fill('NuevaClaveSegura456');
  await ingreso.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByText('Cliente Google', { exact: true })).toBeVisible();
});
