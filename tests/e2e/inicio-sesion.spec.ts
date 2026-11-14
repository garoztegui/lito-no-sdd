import { expect, test } from '@playwright/test';

test('un cliente accede a su cuenta con email y contraseña', async ({ browser }) => {
  const email = `prueba-${crypto.randomUUID()}@example.com`;
  const password = 'ClaveSegura123';
  const registro = await browser.newContext({ baseURL: 'http://localhost:3000' });
  const paginaRegistro = await registro.newPage();
  await paginaRegistro.goto('/');
  await paginaRegistro.getByRole('link', { name: 'CREAR UNA' }).click();
  await paginaRegistro.getByLabel('Nombre completo').fill('Ana Ejemplo');
  await paginaRegistro.getByLabel('Teléfono').fill('099123456');
  await paginaRegistro.getByRole('form', { name: 'Registro' }).getByLabel('Email').fill(email);
  await paginaRegistro.getByRole('form', { name: 'Registro' }).getByLabel('Contraseña').fill(password);
  await paginaRegistro.getByRole('button', { name: 'CREAR' }).click();
  await expect(paginaRegistro.getByRole('heading', { name: 'LITO MASAJES' })).toBeVisible();
  await registro.close();

  const sesion = await browser.newContext({ baseURL: 'http://localhost:3000' });
  const pagina = await sesion.newPage();
  await pagina.goto('/');
  const formulario = pagina.getByRole('form', { name: 'Iniciar sesión' });
  await formulario.getByLabel('Email').fill(email);
  await formulario.getByLabel('Contraseña').fill(password);
  await formulario.getByRole('button', { name: 'Ingresar' }).click();
  await expect(pagina.getByRole('heading', { name: 'LITO MASAJES' })).toBeVisible();
  await expect(pagina.getByText('Ana Ejemplo', { exact: true })).toBeVisible();
  await pagina.reload();
  await expect(pagina.getByText('Ana Ejemplo', { exact: true })).toBeVisible();
  await sesion.close();
});

test('el ingreso con credenciales inválidas muestra un error', async ({ page }) => {
  await page.goto('/');
  const formulario = page.getByRole('form', { name: 'Iniciar sesión' });
  await formulario.getByLabel('Email').fill(`inexistente-${crypto.randomUUID()}@example.com`);
  await formulario.getByLabel('Contraseña').fill('ClaveIncorrecta123');
  await formulario.getByRole('button', { name: 'Ingresar' }).click();
  await expect(formulario.getByText('No se pudo iniciar sesión.')).toBeVisible();
});

test('el ingreso muestra que está procesando la solicitud', async ({ page }) => {
  let liberar!: () => void;
  const espera = new Promise<void>(resolve => { liberar = resolve; });
  await page.route('**/auth/v1/token?grant_type=password', async route => { await espera; await route.continue(); });
  await page.goto('/');
  const formulario = page.getByRole('form', { name: 'Iniciar sesión' });
  await formulario.getByLabel('Email').fill('prueba@example.com');
  await formulario.getByLabel('Contraseña').fill('ClaveSegura123');
  await formulario.getByRole('button', { name: 'Ingresar' }).click();
  try {
    await expect(formulario.getByRole('button', { name: 'Ingresando...' })).toBeDisabled();
  } finally {
    liberar();
  }
});

test('la cuenta sigue accesible después de recargar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Ana Ejemplo');
  await registro.getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'CREAR' }).click();
  await expect(registro).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'LITO MASAJES' })).toBeVisible();
});

test('un ingreso fallido conserva el email', async ({ page }) => {
  await page.goto('/');
  const formulario = page.getByRole('form', { name: 'Iniciar sesión' });
  await formulario.getByLabel('Email').fill('inexistente@example.com');
  await formulario.getByLabel('Contraseña').fill('ClaveIncorrecta123');
  await formulario.getByRole('button', { name: 'Ingresar' }).click();
  await expect(formulario.getByText('No se pudo iniciar sesión.')).toBeVisible();
  await expect(formulario.getByLabel('Email')).toHaveValue('inexistente@example.com');
});
