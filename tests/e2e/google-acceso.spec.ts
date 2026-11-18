import { expect, test } from '@playwright/test';

test('ofrece el ingreso con Google junto al acceso existente', async ({ page }) => {
  await page.goto('/');
  const ingreso = page.getByRole('form', { name: 'Iniciar sesión' });
  await expect(ingreso.getByLabel('Email')).toBeVisible();
  await expect(ingreso.getByLabel('Contraseña')).toBeVisible();
  await expect(ingreso.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  await expect(ingreso.getByRole('button', { name: 'Continuar con Google' }).locator('img')).toBeVisible();
});

test('informa si el retorno de Google no contiene un código válido', async ({ page }) => {
  await page.goto('/auth/callback');
  await expect(page.getByRole('form', { name: 'Iniciar sesión' }).getByRole('alert')).toHaveText('No se pudo iniciar sesión con Google. Intentá nuevamente.');
});

test('exige completar los datos faltantes y conserva el perfil al volver a entrar', async ({ page }) => {
  const id = '00000000-0000-4000-8000-000000000021';
  const email = 'google@example.test';
  const user = { id, email, aud: 'authenticated', app_metadata: { provider: 'google', providers: ['google'] }, user_metadata: {}, created_at: new Date().toISOString() };
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;
  let perfil = { nombre: 'Ana Ejemplo', telefono: null as string | null, sexo: null as string | null };
  await page.route('**/auth/v1/token?grant_type=password', route => route.fulfill({ json: { access_token: token, refresh_token: 'refresh-test', token_type: 'bearer', expires_in: 3600, user } }));
  await page.route('**/auth/v1/user', route => route.fulfill({ json: user }));
  await page.route('**/rest/v1/perfiles?*', async route => {
    if (route.request().method() === 'PATCH') {
      perfil = route.request().postDataJSON();
      await route.fulfill({ json: { id } });
    } else {
      await route.fulfill({ json: perfil });
    }
  });
  await page.goto('/');
  const ingreso = page.getByRole('form', { name: 'Iniciar sesión' });
  await ingreso.getByLabel('Email').fill(email);
  await ingreso.getByLabel('Contraseña').fill('password');
  await ingreso.getByRole('button', { name: 'Ingresar', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Completá tus datos' });
  await expect(modal).toBeVisible();
  await expect(modal.getByLabel('Nombre completo')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(modal).toBeVisible();
  await modal.getByLabel('Teléfono').fill('099123456');
  await modal.getByLabel('Sexo').selectOption('Mujer');
  await modal.getByRole('button', { name: 'Guardar datos' }).click();
  await expect(modal).toBeHidden();
  expect(perfil).toEqual({ nombre: 'Ana Ejemplo', telefono: '099123456', sexo: 'Mujer' });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'LITO MASAJES & FISIOTERAPIA' })).toBeVisible();
  await expect(modal).toHaveCount(0);
});
