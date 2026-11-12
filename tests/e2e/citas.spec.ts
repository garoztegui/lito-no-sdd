import { expect, test } from '@playwright/test';
import { fechaConTurnoDisponible } from './horarios';

test('un cliente solicita un turno disponible', async ({ page }) => {
  await page.goto('/');
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Cliente Ejemplo');
  await registro.getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'Registrarse' }).click();
  await expect(registro.getByText('Cuenta creada.')).toBeVisible();
  await page.reload();

  const fecha = new Date(Date.now() + (35 + Math.floor(Math.random() * 25)) * 86400000);
  while ([0, 6].includes(fecha.getUTCDay())) fecha.setUTCDate(fecha.getUTCDate() + 1);
  await page.getByLabel('Fecha').fill(fecha.toISOString().slice(0, 10));
  await page.getByLabel('Servicio').selectOption({ label: 'Masaje deportivo' });
  await expect(page.getByRole('button', { name: /^\d\d:00 (Disponible|Ocupado)$/ })).toHaveCount(12);
  const disponible = page.getByRole('button', { name: /Disponible$/ }).first();
  const hora = (await disponible.innerText()).slice(0, 5);
  await disponible.click();
  await expect(page.getByRole('button', { name: `${hora} Seleccionado` })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Solicitar cita' }).click();
  await expect(page.getByText('Solicitud enviada. Tu cita está pendiente.')).toBeVisible();
  await expect(page.getByRole('button', { name: `${hora} Ocupado` })).toBeDisabled();
});

test('si falla la consulta no se muestran horarios como disponibles', async ({ page }) => {
  await page.goto('/');
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Cliente Ejemplo');
  await registro.getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'Registrarse' }).click();
  await expect(registro.getByText('Cuenta creada.')).toBeVisible();
  await page.route('**/rest/v1/rpc/horarios_ocupados', route => route.fulfill({ status: 503, body: '{}' }));
  await page.reload();
  const fecha = new Date(Date.now() + 40 * 86400000);
  while ([0, 6].includes(fecha.getUTCDay())) fecha.setUTCDate(fecha.getUTCDate() + 1);
  await page.getByLabel('Fecha').fill(fecha.toISOString().slice(0, 10));
  await expect(page.getByText('No se pudieron consultar los horarios. Intentá nuevamente.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Disponible$/ })).toHaveCount(0);
});

test('un horario tomado mientras otro cliente lo solicita muestra un error', async ({ browser }) => {
  const contextos = await Promise.all([browser.newContext({ baseURL: 'http://localhost:3000' }), browser.newContext({ baseURL: 'http://localhost:3000' })]);
  const paginas = await Promise.all(contextos.map(contexto => contexto.newPage()));
  for (const page of paginas) {
    await page.goto('/');
    const registro = page.getByRole('form', { name: 'Registro' });
    await registro.getByLabel('Nombre completo').fill('Cliente Ejemplo');
    await registro.getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
    await registro.getByLabel('Teléfono').fill('099123456');
    await registro.getByLabel('Contraseña').fill('ClaveSegura123');
    await registro.getByRole('button', { name: 'Registrarse' }).click();
    await expect(registro.getByText('Cuenta creada.')).toBeVisible();
    await page.reload();
  }
  const fecha = fechaConTurnoDisponible();
  for (const page of paginas) {
    await page.getByLabel('Fecha').fill(fecha);
    await page.getByLabel('Servicio').selectOption({ label: 'Espalda' });
    await expect(page.getByRole('button', { name: /Disponible$/ }).first()).toBeVisible();
  }
  const disponible = paginas[0].getByRole('button', { name: /Disponible$/ }).first();
  const hora = (await disponible.innerText()).slice(0, 5);
  await disponible.click();
  await paginas[1].getByRole('button', { name: `${hora} Disponible` }).click();
  await paginas[0].getByRole('button', { name: 'Solicitar cita' }).click();
  await expect(paginas[0].getByText('Solicitud enviada. Tu cita está pendiente.')).toBeVisible();
  await paginas[1].getByRole('button', { name: 'Solicitar cita' }).click();
  await expect(paginas[1].getByText('No se pudo solicitar la cita. El horario puede haber dejado de estar disponible.')).toBeVisible();
  await expect(paginas[1].getByRole('button', { name: `${hora} Ocupado` })).toBeDisabled();
  await Promise.all(contextos.map(contexto => contexto.close()));
});

test('si la solicitud no responde se informa y termina la espera', async ({ page }) => {
  await page.goto('/');
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Cliente Ejemplo');
  await registro.getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'Registrarse' }).click();
  await expect(registro.getByText('Cuenta creada.')).toBeVisible();
  await page.reload();
  await page.getByLabel('Fecha').fill(fechaConTurnoDisponible());
  await page.getByLabel('Servicio').selectOption({ label: 'Espalda' });
  await page.getByRole('button', { name: /Disponible$/ }).first().click();
  let liberar!: () => void;
  const espera = new Promise<void>(resolve => { liberar = resolve; });
  await page.route('**/', async route => {
    if (route.request().method() === 'POST' && route.request().headers()['next-action']) { await espera; await route.abort(); }
    else await route.continue();
  });
  await page.clock.install();
  const llamada = page.waitForRequest(request => request.method() === 'POST' && !!request.headers()['next-action']);
  await page.getByRole('button', { name: 'Solicitar cita' }).click();
  await llamada;
  try {
    await page.clock.fastForward(16000);
    await expect(page.getByText('No pudimos confirmar la solicitud. Revisá los horarios antes de intentar nuevamente.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enviando...' })).toHaveCount(0);
  } finally { liberar(); }
});

test('si la consulta de horarios no responde permite reintentar', async ({ page }) => {
  await page.goto('/');
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Cliente Ejemplo');
  await registro.getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'Registrarse' }).click();
  await expect(registro.getByText('Cuenta creada.')).toBeVisible();
  let liberar!: () => void;
  const espera = new Promise<void>(resolve => { liberar = resolve; });
  await page.route('**/rest/v1/rpc/horarios_ocupados', async route => { await espera; await route.abort(); });
  await page.clock.install();
  const llamada = page.waitForRequest('**/rest/v1/rpc/horarios_ocupados');
  await page.reload();
  await llamada;
  try {
    await page.clock.fastForward(16000);
    await expect(page.getByRole('region', { name: 'Solicitar una cita' }).getByRole('button', { name: 'Reintentar' })).toBeVisible();
    await expect(page.getByText('No se pudieron consultar los horarios. Intentá nuevamente.')).toBeVisible();
  } finally { liberar(); }
});
