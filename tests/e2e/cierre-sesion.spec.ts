import { expect, test, type Page } from '@playwright/test';

async function registrar(page: Page) {
  const email = `prueba-${crypto.randomUUID()}@example.com`;
  const password = 'ClaveSegura123';
  await page.goto('/');
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Cliente Ejemplo');
  await registro.getByLabel('Email').fill(email);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill(password);
  const creacion = page.waitForResponse(response => response.url().includes('/auth/v1/signup'));
  await registro.getByRole('button', { name: 'Registrarse' }).click();
  const respuesta = await creacion;
  const { refresh_token } = await respuesta.json();
  await expect(registro.getByText('Cuenta creada.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Cliente Ejemplo', { exact: true })).toBeVisible();
  return { email, password, refresh_token, url: new URL(respuesta.url()).origin, apikey: respuesta.request().headers().apikey };
}

test('cerrar sesión vuelve al ingreso y sigue cerrada al recargar', async ({ page }) => {
  const { email, password, refresh_token, url, apikey } = await registrar(page);
  const cierre = page.waitForResponse(response => response.url().includes('/auth/v1/logout'));
  await page.getByText('Cliente Ejemplo', { exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  expect((await cierre).ok()).toBe(true);
  await expect(page.getByRole('form', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mi cuenta' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Solicitar una cita' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Mis citas' })).toHaveCount(0);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('form', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mi cuenta' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Solicitar una cita' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Mis citas' })).toHaveCount(0);
  const renovacion = await page.request.post(`${url}/auth/v1/token?grant_type=refresh_token`, {
    headers: { apikey }, data: { refresh_token },
  });
  expect(renovacion.ok()).toBe(false);
  const ingreso = page.getByRole('form', { name: 'Iniciar sesión' });
  await ingreso.getByLabel('Email').fill(email);
  await ingreso.getByLabel('Contraseña').fill(password);
  await ingreso.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByText('Cliente Ejemplo', { exact: true })).toBeVisible();
});

test('cerrar sesión no cierra la sesión de otro dispositivo', async ({ page, browser }) => {
  const { email, password } = await registrar(page);
  const otro = await browser.newContext({ baseURL: 'http://localhost:3000' });
  try {
    const pagina = await otro.newPage();
    await pagina.goto('/');
    const ingreso = pagina.getByRole('form', { name: 'Iniciar sesión' });
    await ingreso.getByLabel('Email').fill(email);
    await ingreso.getByLabel('Contraseña').fill(password);
    const inicio = pagina.waitForResponse(response => response.url().includes('/auth/v1/token?grant_type=password'));
    await ingreso.getByRole('button', { name: 'Ingresar' }).click();
    const respuesta = await inicio;
    const { refresh_token } = await respuesta.json();
    await expect(pagina.getByText('Cliente Ejemplo', { exact: true })).toBeVisible();
    const cierre = page.waitForResponse(response => response.url().includes('/auth/v1/logout'));
    await page.getByText('Cliente Ejemplo', { exact: true }).click();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    expect((await cierre).ok()).toBe(true);
    await expect(page.getByRole('form', { name: 'Iniciar sesión' })).toBeVisible();
    await pagina.reload();
    await expect(pagina.getByText('Cliente Ejemplo', { exact: true })).toBeVisible();
    const renovacion = await pagina.request.post(`${new URL(respuesta.url()).origin}/auth/v1/token?grant_type=refresh_token`, {
      headers: { apikey: respuesta.request().headers().apikey },
      data: { refresh_token },
    });
    expect(renovacion.ok()).toBe(true);
  } finally {
    await otro.close();
  }
});

test('cerrar sesión también actualiza otra pestaña del mismo navegador', async ({ page, context }) => {
  const { email } = await registrar(page);
  const otra = await context.newPage();
  await otra.goto('/');
  await expect(otra.getByText('Cliente Ejemplo', { exact: true })).toBeVisible();
  await page.getByText('Cliente Ejemplo', { exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(otra.getByRole('form', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(otra.getByRole('heading', { name: 'Mi cuenta' })).toHaveCount(0);
});

test('informa si el servidor no confirma el cierre de sesión', async ({ page }) => {
  await registrar(page);
  await page.route('**/auth/v1/logout**', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Error"}' }));
  await page.getByText('Cliente Ejemplo', { exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('alert').getByText('Se cerró la sesión en este dispositivo, pero no se pudo confirmar el cierre en el servidor.')).toBeVisible();
  await expect(page.getByRole('form', { name: 'Iniciar sesión' })).toBeVisible();
});

test('avisa si la confirmación del servidor no responde', async ({ page }) => {
  const { email, password } = await registrar(page);
  let liberar!: () => void;
  const espera = new Promise<void>(resolve => { liberar = resolve; });
  await page.route('**/auth/v1/logout**', async route => { await espera; await route.abort(); });
  await page.clock.install();
  const solicitud = page.waitForRequest(request => request.url().includes('/auth/v1/logout'));
  await page.getByText('Cliente Ejemplo', { exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await solicitud;
  try {
    await page.clock.fastForward(16000);
    await expect(page.getByRole('alert').getByText('Se cerró la sesión en este dispositivo, pero no se pudo confirmar el cierre en el servidor.')).toBeVisible();
    const ingreso = page.getByRole('form', { name: 'Iniciar sesión' });
    await expect(ingreso).toBeVisible();
    await ingreso.getByLabel('Email').fill(email);
    await ingreso.getByLabel('Contraseña').fill(password);
    await ingreso.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByText('Cliente Ejemplo', { exact: true })).toBeVisible({ timeout: 5000 });
  } finally { liberar(); }
});
