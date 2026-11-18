import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

async function registrar(page: Page, email: string) {
  await page.route('**/auth/v1/signup*', async route => {
    if (new URL(route.request().url()).origin !== 'http://127.0.0.1:57521') return route.abort();
    const respuesta = await route.fetch({ maxRedirects: 0 });
    if (respuesta.status() >= 300 && respuesta.status() < 400) return route.abort();
    return route.fulfill({ response: respuesta });
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Crear cuenta.' }).click();
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Persona Prueba');
  await registro.getByLabel('Email').fill(email);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'CREAR' }).click();
  await expect(registro).toBeHidden();
  await expect(page.getByText('Persona Prueba', { exact: true })).toBeVisible();
}

function sql(consulta: string) {
  return execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tAc', consulta], { encoding: 'utf8' }).trim();
}

async function verificarRecomendacion(page: Page) {
  const enlace = page.getByRole('link', { name: 'Recomendar a LITO!' });
  await expect(enlace).toBeVisible();
  const destino = new URL((await enlace.getAttribute('href'))!);
  expect(destino.origin).toBe('https://wa.me');
  expect(destino.pathname).toBe('/');
  expect(destino.searchParams.get('text')).toContain('https://lito-reservas.vercel.app');
  expect(destino.searchParams.get('text')).toContain('💆');
}

test('el cliente consulta las tres secciones desde el menú en celular', async ({ page }) => {
  const email = `informacion-${crypto.randomUUID()}@example.test`;
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('https://maps.google.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Mapa de prueba</body></html>' }));
    await registrar(page, email);
    await page.locator('.menu-cuenta summary').click();
    const opciones = page.locator('.menu-cuenta-opciones');
    await expect(opciones.locator('a').first()).toHaveText('¿Cómo funciona?');
    await verificarRecomendacion(page);
    await opciones.getByRole('link', { name: '¿Cómo funciona?' }).click();
    await expect(page.getByRole('heading', { name: '¿Cómo funciona?' })).toBeVisible();
    await expect(page.getByText(/4 horas/).first()).toBeVisible();
    await expect(page.getByText(/12 horas/).first()).toBeVisible();
    await expect(page.getByText('¿Hay propuesta? Tú decides 🤔')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.setViewportSize({ width: 320, height: 700 });
    await page.locator('.menu-cuenta summary').click();
    await page.getByRole('link', { name: 'Ubicación' }).click();
    await expect(page.getByText('Isla de Gaspar 2445, Montevideo, Uruguay')).toBeVisible();
    await expect(page.locator('iframe[title="Mapa de ubicación de LITO"]')).toHaveAttribute('src', /Isla\+de\+Gaspar\+2445/);
    expect((await page.locator('iframe[title="Mapa de ubicación de LITO"]').boundingBox())!.width).toBeGreaterThanOrEqual(200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator('.menu-cuenta summary').click();
    await page.getByRole('link', { name: 'Medios de pago y contacto' }).click();
    await expect(page.getByText('094 553 211')).toBeVisible();
    await expect(page.getByRole('link', { name: '094 553 211' })).toHaveAttribute('href', 'https://wa.me/59894553211');
    await expect(page.getByText('BANCO REPUBLICA $ 00040248300001')).toBeVisible();
    await expect(page.getByText('José Luis')).toBeVisible();
    await expect(page.getByText('EFECTIVO')).toBeVisible();
    const telefono = await page.getByText('094 553 211').boundingBox();
    const medios = await page.getByRole('heading', { name: 'Medios de pago', exact: true }).boundingBox();
    expect(telefono!.y).toBeLessThan(medios!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'Volver al inicio' }).click();
    await expect(page.getByRole('button', { name: 'Mis citas', exact: true })).toBeVisible();
  } finally {
    sql(`delete from auth.users where email='${email}'`);
  }
});

test('el administrador ve la ayuda pero no las opciones exclusivas de clientes', async ({ page }) => {
  const email = `informacion-admin-${crypto.randomUUID()}@example.test`;
  try {
    await registrar(page, email);
    sql(`update public.perfiles set es_administrador=true where id=(select id from auth.users where email='${email}')`);
    await page.reload();
    await expect(page.getByRole('link', { name: 'Ver agenda' })).toBeVisible();
    await page.locator('.menu-cuenta summary').click();
    await expect(page.getByRole('link', { name: '¿Cómo funciona?' })).toBeVisible();
    await verificarRecomendacion(page);
    await expect(page.getByRole('link', { name: 'Ubicación', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Medios de pago y contacto' })).toHaveCount(0);
    await page.getByRole('link', { name: '¿Cómo funciona?' }).click();
    await expect(page.getByRole('heading', { name: '¿Cómo funciona?' })).toBeVisible();
    await expect(page.getByText(/12 horas/).first()).toBeVisible();
    await expect(page.getByText('¿Hay propuesta? Tú decides 🤔')).toBeVisible();
    for (const ruta of ['/ubicacion', '/medios-de-pago-y-contacto']) {
      await page.goto(ruta);
      await expect(page).toHaveURL('/');
    }
  } finally {
    sql(`delete from auth.users where email='${email}'`);
  }
});

test('las páginas de ubicación y pago requieren una sesión de cliente', async ({ page }) => {
  for (const ruta of ['/ubicacion', '/medios-de-pago-y-contacto']) {
    await page.goto(ruta);
    await expect(page).toHaveURL('/');
  }
});

test('un cliente con perfil incompleto no recibe las páginas protegidas', async ({ page }) => {
  const id = crypto.randomUUID();
  const email = `incompleto-${id}@example.test`;
  try {
    sql(`insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, encrypted_password, confirmation_token, recovery_token, email_change, email_change_token_new, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      values ('${id}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '${email}', now(), extensions.crypt('ClaveSegura123', extensions.gen_salt('bf')), '', '', '', '', '{"provider":"google","providers":["google","email"]}', '{"full_name":"Cliente Google"}', now(), now());
      insert into auth.identities (provider_id, user_id, provider, identity_data, created_at, updated_at) values ('${id}', '${id}', 'email', jsonb_build_object('sub', '${id}', 'email', '${email}', 'email_verified', true), now(), now())`);
    await page.route('**/auth/v1/token?grant_type=password', async route => {
      if (new URL(route.request().url()).origin !== 'http://127.0.0.1:57521') return route.abort();
      const respuesta = await route.fetch({ maxRedirects: 0 });
      if (respuesta.status() >= 300 && respuesta.status() < 400) return route.abort();
      return route.fulfill({ response: respuesta });
    });
    await page.goto('/');
    const ingreso = page.getByRole('form', { name: 'Iniciar sesión' });
    await ingreso.getByLabel('Email').fill(email);
    await ingreso.getByLabel('Contraseña').fill('ClaveSegura123');
    await ingreso.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Completá tus datos' })).toBeVisible();
    for (const ruta of ['/ubicacion', '/medios-de-pago-y-contacto']) {
      const respuesta = await page.goto(ruta);
      const html = await respuesta!.text();
      expect(html).not.toContain('BANCO REPUBLICA $ 00040248300001');
      expect(html).not.toContain('Isla de Gaspar 2445');
      await expect(page.getByRole('dialog', { name: 'Completá tus datos' })).toBeVisible();
    }
  } finally {
    sql(`delete from auth.users where id='${id}'`);
  }
});
