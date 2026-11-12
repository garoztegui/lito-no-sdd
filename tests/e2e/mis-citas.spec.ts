import { expect, test, type Page } from '@playwright/test';
import { fechaConTurnoDisponible } from './horarios';

async function ingresarComoCliente(page: Page) {
  await page.goto('/');
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Cliente Ejemplo');
  await registro.getByLabel('Email').fill(`prueba-${crypto.randomUUID()}@example.com`);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'Registrarse' }).click();
  await expect(registro.getByText('Cuenta creada.')).toBeVisible();
}

test('un cliente sin citas ve el mensaje de lista vacía', async ({ page }) => {
  await ingresarComoCliente(page);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Mis citas' }).getByText('Todavía no tenés citas.')).toBeVisible();
});

test('se muestran citas pasadas y futuras con fecha, hora y estado en Montevideo', async ({ page }) => {
  await ingresarComoCliente(page);
  await page.route(/\/rest\/v1\/citas(?:\?|$)/, route => route.fulfill({ json: [
    { id: '1', inicio: '2028-01-07T13:00:00Z', servicio: 'Espalda', estado: 'pendiente' },
    { id: '2', inicio: '2024-01-08T21:00:00Z', servicio: 'Cuerpo entero', estado: 'pendiente' },
  ] }));
  await page.reload();
  const citas = page.getByRole('region', { name: 'Mis citas' });
  await expect(citas.getByRole('listitem')).toHaveCount(2);
  for (const texto of ['Espalda', '7 de enero de 2028', '10:00', 'Pendiente']) await expect(citas.getByRole('listitem').nth(0)).toContainText(texto);
  for (const texto of ['Cuerpo entero', '8 de enero de 2024', '18:00', 'Cancelada']) await expect(citas.getByRole('listitem').nth(1)).toContainText(texto);
});

test('se muestra el historial completo cuando ocupa varias páginas', async ({ page }) => {
  await ingresarComoCliente(page);
  const historial = Array.from({ length: 501 }, (_, indice) => ({
    id: String(indice), inicio: '2024-01-08T21:00:00Z',
    servicio: indice === 500 ? 'Última cita' : 'Espalda', estado: 'pendiente',
  }));
  await page.route(/\/rest\/v1\/citas(?:\?|$)/, route => {
    const parametros = new URL(route.request().url()).searchParams;
    const desde = Number(parametros.get('offset') ?? 0);
    const cantidad = Number(parametros.get('limit') ?? 1000);
    return route.fulfill({ json: historial.slice(desde, desde + cantidad) });
  });
  await page.reload();
  const citas = page.getByRole('region', { name: 'Mis citas' });
  await expect(citas.getByRole('listitem')).toHaveCount(501);
  await expect(citas.getByText('Última cita')).toBeVisible();
});

test('un error al consultar permite reintentar sin mostrar una lista vacía', async ({ page }) => {
  await ingresarComoCliente(page);
  let fallar = true;
  await page.route(/\/rest\/v1\/citas(?:\?|$)/, route => {
    if (fallar && route.request().method() === 'GET') return route.fulfill({ status: 400, body: '{}' });
    return route.continue();
  });
  await page.reload();
  const citas = page.getByRole('region', { name: 'Mis citas' });
  await expect(citas.getByText('No se pudieron cargar tus citas.')).toBeVisible();
  await expect(citas.getByText('Todavía no tenés citas.')).toHaveCount(0);
  fallar = false;
  await citas.getByRole('button', { name: 'Reintentar' }).focus();
  await page.keyboard.press('Enter');
  await expect(citas.getByText('Todavía no tenés citas.')).toBeVisible();
});

test('una solicitud nueva aparece en Mis citas sin recargar', async ({ page }) => {
  await ingresarComoCliente(page);
  await page.reload();
  const fecha = new Date(Date.now() + (35 + Math.floor(Math.random() * 25)) * 86400000);
  while ([0, 6].includes(fecha.getUTCDay())) fecha.setUTCDate(fecha.getUTCDate() + 1);
  await page.getByLabel('Fecha').fill(fecha.toISOString().slice(0, 10));
  await page.getByLabel('Servicio').selectOption({ label: 'Espalda' });
  await page.getByRole('button', { name: /Disponible$/ }).first().click();
  await page.getByRole('button', { name: 'Solicitar cita' }).click();
  await expect(page.getByText('Solicitud enviada. Tu cita está pendiente.')).toBeVisible();
  const citas = page.getByRole('region', { name: 'Mis citas' });
  await expect(citas.getByRole('listitem')).toHaveCount(1);
  await expect(citas.getByRole('listitem').first()).toContainText('Espalda');
  await expect(citas.getByRole('listitem').first()).toContainText('Pendiente');
});

test('una consulta sin respuesta muestra carga y permite reintentar', async ({ page }) => {
  await ingresarComoCliente(page);
  let liberar!: () => void;
  const espera = new Promise<void>(resolve => { liberar = resolve; });
  const patron = /\/rest\/v1\/citas(?:\?|$)/;
  await page.route(patron, async route => {
    if (route.request().method() !== 'GET') return route.continue();
    await espera;
    await route.abort().catch(() => {});
  });
  await page.clock.install();
  const solicitud = page.waitForRequest(request => patron.test(request.url()) && request.method() === 'GET');
  await page.reload();
  await solicitud;
  const citas = page.getByRole('region', { name: 'Mis citas' });
  try {
    await expect(citas.getByText('Cargando tus citas...')).toBeVisible();
    await page.clock.fastForward(16000);
    await expect(citas.getByText('No se pudieron cargar tus citas.')).toBeVisible();
  } finally { liberar(); }
  await page.unroute(patron);
  await citas.getByRole('button', { name: 'Reintentar' }).click();
  await expect(citas.getByText('Todavía no tenés citas.')).toBeVisible();
});

test('el cliente cancela su solicitud y el horario vuelve a estar disponible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ingresarComoCliente(page);
  await page.reload();
  await page.getByLabel('Fecha').fill(fechaConTurnoDisponible());
  await page.getByLabel('Servicio').selectOption({ label: 'Espalda' });
  const horario = page.getByRole('button', { name: /Disponible$/ }).first();
  const nombre = await horario.innerText();
  const hora = nombre.slice(0, 5);
  await horario.click();
  await page.getByRole('button', { name: 'Solicitar cita' }).click();
  await expect(page.getByText('Solicitud enviada. Tu cita está pendiente.')).toBeVisible();
  await expect(page.getByRole('button', { name: `${hora} Ocupado` })).toBeDisabled();
  const citas = page.getByRole('region', { name: 'Mis citas' });
  await citas.getByRole('button', { name: 'Cancelar cita' }).focus();
  await page.keyboard.press('Enter');
  await expect(citas.getByRole('status')).toHaveText('La cita quedó cancelada.');
  await expect(citas.getByRole('listitem')).toContainText('Cancelada');
  await expect(page.getByRole('button', { name: `${hora} Disponible` })).toBeEnabled();
});

test('una cita confirmada dentro del límite informa que no puede cancelarse', async ({ page }) => {
  await ingresarComoCliente(page);
  const inicio = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
  await page.route(/\/rest\/v1\/citas(?:\?|$)/, route => route.fulfill({ json: [
    { id: '11111111-1111-1111-1111-111111111111', inicio, servicio: 'Espalda', estado: 'confirmada' },
  ] }));
  await page.route(/\/rest\/v1\/rpc\/cancelar_cita_cliente(?:\?|$)/, route => route.fulfill({ json: 'fuera_de_plazo' }));
  await page.reload();
  const citas = page.getByRole('region', { name: 'Mis citas' });
  await citas.getByRole('button', { name: 'Cancelar cita' }).click();
  await expect(citas.getByRole('status')).toHaveText('Ya no podés cancelar esta cita: faltan 24 horas o menos.');
  await expect(citas.getByRole('listitem')).toContainText('Confirmada');
});
