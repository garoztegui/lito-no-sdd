import { expect, test } from '@playwright/test';

test('email y contraseña son obligatorios antes de enviar el registro', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Ana Ejemplo');
  await registro.getByLabel('Teléfono').fill('099123456');
  const email = registro.getByLabel('Email');
  const password = registro.getByLabel('Contraseña');
  await expect(email).toHaveAttribute('required', '');
  await expect(password).toHaveAttribute('required', '');
  await registro.getByRole('button', { name: 'CREAR' }).click();
  await expect(email).toBeFocused();
  await email.fill('ana@example.test');
  await registro.getByRole('button', { name: 'CREAR' }).click();
  await expect(password).toBeFocused();
  await expect(registro).toBeVisible();
});

test('el formulario de registro solicita los cinco datos', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();

  await expect(page.getByLabel('Nombre completo')).toBeVisible();
  await expect(page.getByRole('form', { name: 'Registro' }).getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Teléfono')).toBeVisible();
  await expect(page.getByLabel('Sexo')).toBeVisible();
  await expect(page.getByRole('form', { name: 'Registro' }).getByLabel('Contraseña')).toBeVisible();
});

test('el campo sexo ofrece las tres opciones acordadas', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();

  await expect(page.getByLabel('Sexo').locator('option')).toHaveText([
    'Hombre',
    'Mujer',
    'Prefiero no especificar',
  ]);
});

test('crea una cuenta y obtiene sesión sin confirmar el email', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();
  await page.getByLabel('Nombre completo').fill('Ana Ejemplo');
  await page.getByLabel('Teléfono').fill('099123456');
  await page.getByRole('form', { name: 'Registro' }).getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
  await page.getByRole('form', { name: 'Registro' }).getByLabel('Contraseña').fill('ClaveSegura123');

  const signup = page.waitForResponse(response =>
    response.url().includes('/auth/v1/signup') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'CREAR' }).click();
  const response = await signup;
  expect(response.ok()).toBe(true);
  expect((await response.json()).access_token).toBeTruthy();
});

test('el cliente registrado puede consultar sus datos personales', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();
  await page.getByLabel('Nombre completo').fill('Ana Ejemplo');
  await page.getByRole('form', { name: 'Registro' }).getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
  await page.getByLabel('Teléfono').fill('099123456');
  await page.getByLabel('Sexo').selectOption({ label: 'Mujer' });
  await page.getByRole('form', { name: 'Registro' }).getByLabel('Contraseña').fill('ClaveSegura123');
  const signup = page.waitForResponse(response => response.url().includes('/auth/v1/signup'));
  await page.getByRole('button', { name: 'CREAR' }).click();
  const response = await signup;
  const { access_token } = await response.json();
  const profile = await request.get(`${new URL(response.url()).origin}/rest/v1/perfiles?select=nombre,telefono,sexo`, {
    headers: { apikey: response.request().headers().apikey, Authorization: `Bearer ${access_token}` },
  });
  expect(profile.ok()).toBe(true);
  expect(await profile.json()).toEqual([{ nombre: 'Ana Ejemplo', telefono: '099123456', sexo: 'Mujer' }]);
});

test('un cliente no puede consultar el perfil de otro', async ({ browser, request }) => {
  const usuarios = [];
  for (const nombre of ['Cliente Uno', 'Cliente Dos']) {
    const context = await browser.newContext({ baseURL: 'http://localhost:3000' });
    const page = await context.newPage();
    await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();
    await page.getByLabel('Nombre completo').fill(nombre);
    await page.getByRole('form', { name: 'Registro' }).getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
    await page.getByLabel('Teléfono').fill('099123456');
    await page.getByRole('form', { name: 'Registro' }).getByLabel('Contraseña').fill('ClaveSegura123');
    const signup = page.waitForResponse(response => response.url().includes('/auth/v1/signup'));
    await page.getByRole('button', { name: 'CREAR' }).click();
    const response = await signup;
    usuarios.push({ ...(await response.json()), url: response.url(), key: response.request().headers().apikey });
    await context.close();
  }
  const perfiles = await request.get(`${new URL(usuarios[0].url).origin}/rest/v1/perfiles?select=id&id=eq.${usuarios[1].user.id}`, {
    headers: { apikey: usuarios[0].key, Authorization: `Bearer ${usuarios[0].access_token}` },
  });
  expect(perfiles.ok()).toBe(true);
  expect(await perfiles.json()).toEqual([]);
});

test('un usuario sin sesión no puede consultar perfiles', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();
  await page.getByLabel('Nombre completo').fill('Ana Ejemplo');
  await page.getByLabel('Teléfono').fill('099123456');
  await page.getByRole('form', { name: 'Registro' }).getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
  await page.getByRole('form', { name: 'Registro' }).getByLabel('Contraseña').fill('ClaveSegura123');
  const signup = page.waitForResponse(response => response.url().includes('/auth/v1/signup'));
  await page.getByRole('button', { name: 'CREAR' }).click();
  const response = await signup;
  const perfiles = await request.get(`${new URL(response.url()).origin}/rest/v1/perfiles?select=id`, {
    headers: { apikey: response.request().headers().apikey },
  });
  expect(perfiles.ok()).toBe(true);
  expect(await perfiles.json()).toEqual([]);
});

test('el registro con contraseña inválida muestra un error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Ana Ejemplo');
  await registro.getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('123');
  await registro.getByRole('button', { name: 'CREAR' }).click();
  await expect(registro.getByText('No se pudo completar el registro.')).toBeVisible();
});

test('el registro completo crea la cuenta sin confirmar el email', async ({ page, request }) => {
  const email = `prueba-${crypto.randomUUID()}@example.com`;
  await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Ana Ejemplo');
  await registro.getByLabel('Email').fill(email);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Sexo').selectOption({ label: 'Mujer' });
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  const signup = page.waitForResponse(response => response.url().includes('/auth/v1/signup'));
  await registro.getByRole('button', { name: 'CREAR' }).click();
  const response = await signup;
  const { user, access_token } = await response.json();
  expect(response.ok()).toBe(true);
  expect(user.email).toBe(email);
  expect(access_token).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'LITO MASAJES' })).toBeVisible();
  const perfil = await request.get(`${new URL(response.url()).origin}/rest/v1/perfiles?select=nombre,telefono,sexo`, {
    headers: { apikey: response.request().headers().apikey, Authorization: `Bearer ${access_token}` },
  });
  expect(perfil.ok()).toBe(true);
  expect(await perfil.json()).toEqual([{ nombre: 'Ana Ejemplo', telefono: '099123456', sexo: 'Mujer' }]);
});

test('el registro muestra que está procesando la solicitud', async ({ page }) => {
  let liberar!: () => void;
  const espera = new Promise<void>(resolve => { liberar = resolve; });
  await page.route('**/auth/v1/signup', async route => { await espera; await route.continue(); });
  await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Ana Ejemplo');
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'CREAR' }).click();
  try {
    await expect(registro.getByRole('button', { name: 'Registrando...' })).toBeDisabled();
  } finally {
    liberar();
  }
});

test('el registro sin nombre completo muestra un error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'CREAR' }).click();
  await expect(registro.getByText('Ingresá tu nombre completo.')).toBeVisible();
});

test('el registro sin teléfono muestra un error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Ana Ejemplo');
  await registro.getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'CREAR' }).click();
  await expect(registro.getByText('Ingresá tu teléfono.')).toBeVisible();
});

test('Supabase rechaza un registro sin nombre completo', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Ana Ejemplo');
  await registro.getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  const signup = page.waitForResponse(response => response.url().includes('/auth/v1/signup'));
  await registro.getByRole('button', { name: 'CREAR' }).click();
  const response = await signup;
  const directo = await request.post(response.url(), {
    headers: { apikey: response.request().headers().apikey },
    data: { email: `prueba-${crypto.randomUUID()}@example.com`, password: 'ClaveSegura123',
      data: { nombre: '', telefono: '099123456', sexo: 'Mujer' } },
  });
  expect(directo.ok()).toBe(false);
});

test('Supabase rechaza un registro sin teléfono', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Ana Ejemplo');
  await registro.getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  const signup = page.waitForResponse(response => response.url().includes('/auth/v1/signup'));
  await registro.getByRole('button', { name: 'CREAR' }).click();
  const response = await signup;
  const directo = await request.post(response.url(), {
    headers: { apikey: response.request().headers().apikey },
    data: { email: `prueba-${crypto.randomUUID()}@example.com`, password: 'ClaveSegura123',
      data: { nombre: 'Ana Ejemplo', telefono: '', sexo: 'Mujer' } },
  });
  expect(directo.ok()).toBe(false);
});

test('Supabase rechaza un registro con sexo fuera de las opciones', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Ana Ejemplo');
  await registro.getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  const signup = page.waitForResponse(response => response.url().includes('/auth/v1/signup'));
  await registro.getByRole('button', { name: 'CREAR' }).click();
  const response = await signup;
  const directo = await request.post(response.url(), {
    headers: { apikey: response.request().headers().apikey },
    data: { email: `prueba-${crypto.randomUUID()}@example.com`, password: 'ClaveSegura123',
      data: { nombre: 'Ana Ejemplo', telefono: '099123456', sexo: 'Inválido' } },
  });
  expect(directo.ok()).toBe(false);
});

test('un registro fallido conserva los datos ingresados', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'CREAR UNA' }).click();
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Ana Ejemplo');
  await registro.getByLabel('Email').fill('ana@example.com');
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('123');
  await registro.getByRole('button', { name: 'CREAR' }).click();
  await expect(registro.getByText('No se pudo completar el registro.')).toBeVisible();
  await expect(registro.getByLabel('Nombre completo')).toHaveValue('Ana Ejemplo');
  await expect(registro.getByLabel('Email')).toHaveValue('ana@example.com');
  await expect(registro.getByLabel('Teléfono')).toHaveValue('099123456');
});
test('abre y cancela la creación de cuenta', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('form', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(page.getByRole('form', { name: 'Registro' })).toBeHidden();
  const enlace = page.getByRole('link', { name: 'CREAR UNA' });
  await enlace.click();
  const modal = page.getByRole('dialog', { name: 'Crear cuenta' });
  await expect(modal.getByLabel('Nombre completo')).toBeVisible();
  await modal.getByRole('button', { name: 'Cancelar' }).click();
  await expect(modal).toBeHidden();
  await expect(enlace).toBeFocused();
});
